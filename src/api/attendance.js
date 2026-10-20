import { sastToday } from '../lib/time.js'
import { db, fetchAll, run, searchTerm } from './client.js'

export const getToday = (candidateId) =>
  run(db().from('attendance_overview').select('*').eq('candidate_id', candidateId).eq('attendance_date', sastToday()).maybeSingle())

export const checkIn = ({ workMode, location, notes }) =>
  run(db().rpc('check_in', { p_work_mode: workMode, p_location: location || null, p_notes: notes || null }).single())

export const checkOut = () => run(db().rpc('check_out').single())

/**
 * filters: { candidateId, search, from, to, mode: 'office'|'wfh', completion: 'open'|'complete', cohort }
 * RLS decides which candidates are visible; filters only narrow that set.
 */
function filtered(f = {}, opts) {
  let q = db().from('attendance_overview').select('*', opts)
  if (f.candidateId) q = q.eq('candidate_id', f.candidateId)
  if (f.from) q = q.gte('attendance_date', f.from)
  if (f.to) q = q.lte('attendance_date', f.to)
  if (f.mode) q = q.eq('work_mode', f.mode)
  if (f.cohort) q = q.eq('cohort', f.cohort)
  if (f.completion === 'open') q = q.is('check_out_at', null)
  if (f.completion === 'complete') q = q.not('check_out_at', 'is', null)
  const s = f.search && searchTerm(f.search)
  if (s) q = q.or(`full_name.ilike.*${s}*,candidate_identifier.ilike.*${s}*`)
  return q.order('attendance_date', { ascending: false }).order('check_in_at', { ascending: false })
}

export function listAttendance(filters, { page = 1, pageSize = 20 } = {}) {
  const from = (page - 1) * pageSize
  return run(filtered(filters, { count: 'exact' }).range(from, from + pageSize - 1))
}

export const exportAttendance = (filters) => fetchAll(() => filtered(filters))
