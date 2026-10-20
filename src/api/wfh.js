import { db, fetchAll, run, searchTerm } from './client.js'

export const submitWfh = ({ date, reason, details }) =>
  run(db().rpc('submit_wfh_request', { p_date: date, p_reason: reason, p_details: details || null }).single())

export const decideWfh = (id, decision, comment) =>
  run(db().rpc('decide_wfh_request', { p_id: id, p_decision: decision, p_comment: comment || null }).single())

/** filters: { candidateId, search, status, from, to (requested date), submittedFrom, submittedTo, cohort } */
function filtered(f = {}, opts) {
  let q = db().from('wfh_overview').select('*', opts)
  if (f.candidateId) q = q.eq('candidate_id', f.candidateId)
  if (f.status) q = q.eq('status', f.status)
  if (f.from) q = q.gte('requested_date', f.from)
  if (f.to) q = q.lte('requested_date', f.to)
  if (f.submittedFrom) q = q.gte('submitted_at', `${f.submittedFrom}T00:00:00+02:00`)
  if (f.submittedTo) q = q.lte('submitted_at', `${f.submittedTo}T23:59:59+02:00`)
  if (f.cohort) q = q.eq('cohort', f.cohort)
  const s = f.search && searchTerm(f.search)
  if (s) q = q.or(`full_name.ilike.*${s}*,candidate_identifier.ilike.*${s}*`)
  // Pending queue reads oldest-first; history newest-first.
  return f.status === 'pending'
    ? q.order('requested_date').order('submitted_at')
    : q.order('requested_date', { ascending: false }).order('submitted_at', { ascending: false })
}

export function listWfh(filters, { page = 1, pageSize = 20 } = {}) {
  const from = (page - 1) * pageSize
  return run(filtered(filters, { count: 'exact' }).range(from, from + pageSize - 1))
}

export const exportWfh = (filters) => fetchAll(() => filtered(filters))

export async function countByStatus(filters = {}) {
  const counts = await Promise.all(
    ['pending', 'approved', 'rejected'].map((status) =>
      run(filtered({ ...filters, status }, { count: 'exact', head: true })).then((r) => r.count),
    ),
  )
  return { pending: counts[0], approved: counts[1], rejected: counts[2] }
}

export const getWfhForDate = (candidateId, date) =>
  run(db().from('wfh_overview').select('*').eq('candidate_id', candidateId).eq('requested_date', date)
    .neq('status', 'rejected').maybeSingle())
