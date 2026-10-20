import { CheckCircle2 } from 'lucide-react'
import { registerStatus } from '../lib/attendance.js'
import { formatDayLong, formatHours, formatTime } from '../lib/time.js'
import Avatar from './ui/Avatar.jsx'
import Badge, { ModeBadge } from './ui/Badge.jsx'
import { Table } from './ui/Table.jsx'

export function CandidateCell({ name, id }) {
  return (
    <span className="flex items-center gap-2.5">
      <Avatar name={name} />
      <span className="min-w-0">
        <span className="block truncate font-medium">{name}</span>
        {id && <span className="block text-xs text-muted">{id}</span>}
      </span>
    </span>
  )
}

export default function AttendanceTable({ rows, showCandidate }) {
  const columns = [
    showCandidate && { key: 'c', header: 'Candidate', render: (r) => <CandidateCell name={r.full_name} id={r.candidate_identifier} /> },
    { key: 'date', header: 'Date', render: (r) => formatDayLong(r.attendance_date), className: 'whitespace-nowrap' },
    { key: 'in', header: 'Check in', render: (r) => formatTime(r.check_in_at) },
    { key: 'out', header: 'Check out', render: (r) => formatTime(r.check_out_at) },
    { key: 'hours', header: 'Hours', render: (r) => formatHours(r.hours) },
    {
      key: 'mode', header: 'Status',
      render: (r) => (
        <span className="flex items-center gap-1.5">
          <ModeBadge mode={r.work_mode} />
          {r.work_mode === 'wfh' && (r.wfh_approved
            ? <CheckCircle2 className="size-4 text-success" aria-label="WFH approved" />
            : <span className="text-xs whitespace-nowrap text-warning">No approval</span>)}
        </span>
      ),
    },
    { key: 'reg', header: 'Register', render: (r) => { const s = registerStatus(r); return <Badge tone={s.tone}>{s.label}</Badge> } },
    { key: 'loc', header: 'Location', render: (r) => <span className="text-muted">{r.location_note ?? '—'}</span> },
  ].filter(Boolean)
  return <Table columns={columns} rows={rows} caption="Attendance records" />
}
