import { db, run } from './client.js'

export const getProfile = (id) => run(db().from('profiles').select('*').eq('id', id).single())

// Column-level grants mean only these two fields are writable by the user anyway.
export const updateMyProfile = (id, { full_name, phone }) =>
  run(db().from('profiles').update({ full_name: full_name.trim(), phone: phone?.trim() || null }).eq('id', id).select().single())

export const getMentor = (mentorId) =>
  mentorId ? run(db().from('profiles').select('id, full_name, email').eq('id', mentorId).maybeSingle()) : null

/** RLS limits this to the calling mentor's assigned candidates. */
export const listMyCandidates = () =>
  run(db().from('profiles').select('*').eq('role', 'candidate').order('full_name'))

/** Calls the Vercel function, which verifies the caller is a mentor before using the service key. */
export async function inviteCandidate(payload) {
  const { data } = await db().auth.getSession()
  const res = await fetch('/api/invite-candidate', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${data.session?.access_token}` },
    body: JSON.stringify(payload),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw Object.assign(new Error(body.error || 'Invite failed'), { code: 'P0001' })
  return body
}
