import { registerStatus } from './attendance.js'
import { formatDate, formatDateTime, formatTime } from './time.js'

const MODE = { office: 'Office', wfh: 'Working From Home' }
const STATUS = { pending: 'Pending', approved: 'Approved', rejected: 'Rejected' }

export const ATTENDANCE_COLUMNS = [
  { header: 'Candidate name', value: (r) => r.full_name },
  { header: 'Candidate ID', value: (r) => r.candidate_identifier },
  { header: 'Cohort', value: (r) => r.cohort },
  { header: 'Date', value: (r) => r.attendance_date },
  { header: 'Check-in time', value: (r) => formatTime(r.check_in_at) },
  { header: 'Check-out time', value: (r) => (r.check_out_at ? formatTime(r.check_out_at) : '') },
  { header: 'Working hours', value: (r) => (r.hours == null ? '' : Number(r.hours).toFixed(2)) },
  { header: 'Work mode', value: (r) => MODE[r.work_mode] },
  { header: 'WFH approved', value: (r) => (r.work_mode === 'wfh' ? (r.wfh_approved ? 'Yes' : 'No') : '') },
  { header: 'Attendance status', value: (r) => registerStatus(r).label },
  { header: 'Location', value: (r) => r.location_note },
]

export const WFH_COLUMNS = [
  { header: 'Candidate name', value: (r) => r.full_name },
  { header: 'Candidate ID', value: (r) => r.candidate_identifier },
  { header: 'Cohort', value: (r) => r.cohort },
  { header: 'WFH requested date', value: (r) => r.requested_date },
  { header: 'Reason', value: (r) => r.reason },
  { header: 'Details', value: (r) => r.details },
  { header: 'WFH status', value: (r) => STATUS[r.status] },
  { header: 'Submitted', value: (r) => formatDateTime(r.submitted_at) },
  { header: 'Decision date', value: (r) => (r.reviewed_at ? formatDateTime(r.reviewed_at) : '') },
  { header: 'Decision-maker', value: (r) => r.reviewer_name ?? '' },
  { header: 'Decision comment', value: (r) => r.decision_comment ?? '' },
]

export function reportFilename(kind, { from, to } = {}) {
  const range = from || to ? `_${from || 'start'}_to_${to || 'today'}` : ''
  return `capaciti-${kind}${range}.csv`
}

export const describeRange = ({ from, to }) =>
  from && to ? `${formatDate(from)} – ${formatDate(to)}` : from ? `from ${formatDate(from)}` : to ? `until ${formatDate(to)}` : 'all dates'
