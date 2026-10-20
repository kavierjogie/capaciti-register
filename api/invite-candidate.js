// Vercel serverless function: a Tech Champion invites a candidate, who is assigned to them.
// The secret (service-role) key lives only here: a server env var, never VITE_-prefixed.
import { createClient } from '@supabase/supabase-js'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) return res.status(500).json({ error: 'Invitations are not configured on the server.' })
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })

  // 1. Who is calling? Verify their JWT with Supabase, then check their role in the database.
  const token = (req.headers.authorization || '').replace(/^Bearer /, '')
  const { data: auth, error: authErr } = await admin.auth.getUser(token)
  if (authErr || !auth?.user) return res.status(401).json({ error: 'Please sign in again.' })
  const { data: caller } = await admin.from('profiles').select('id, role, status').eq('id', auth.user.id).single()
  if (caller?.role !== 'mentor' || caller.status !== 'active') return res.status(403).json({ error: 'Only Tech Champions can invite candidates.' })

  // 2. Validate input on the server too.
  const full_name = String(req.body?.full_name ?? '').trim()
  const email = String(req.body?.email ?? '').trim().toLowerCase()
  const candidate_identifier = String(req.body?.candidate_identifier ?? '').trim()
  const cohort = String(req.body?.cohort ?? '').trim() || null
  if (full_name.length < 2 || full_name.length > 120 || !EMAIL_RE.test(email) || !candidate_identifier || candidate_identifier.length > 40)
    return res.status(400).json({ error: 'Please check the name, email and candidate ID.' })

  const { data: taken } = await admin.from('profiles').select('id').eq('candidate_identifier', candidate_identifier).maybeSingle()
  if (taken) return res.status(409).json({ error: 'That candidate ID is already in use.' })

  // 3. Invite. The on_auth_user_created trigger creates a *candidate* profile; we then fill in the assignment.
  const origin = req.headers.origin || `https://${req.headers.host}`
  const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { full_name }, redirectTo: `${origin}/reset-password`,
  })
  if (inviteErr) {
    const exists = /already been registered|already exists/i.test(inviteErr.message)
    console.error('invite failed', inviteErr.status, inviteErr.code)
    return res.status(exists ? 409 : 502).json({ error: exists ? 'An account with that email already exists.' : 'Could not send the invitation. Try again.' })
  }

  const { error: updErr } = await admin.from('profiles')
    .update({ full_name, candidate_identifier, cohort, mentor_id: caller.id })
    .eq('id', invited.user.id)
  if (updErr) {
    console.error('profile assignment failed', updErr.code)
    return res.status(500).json({ error: 'Invitation sent, but assigning the candidate failed. Ask an administrator to finish setup.' })
  }
  await admin.from('audit_logs').insert({ actor_id: caller.id, action: 'candidate.invited', entity: 'profiles', entity_id: invited.user.id,
    details: { email, candidate_identifier, cohort } })

  return res.status(201).json({ id: invited.user.id })
}
