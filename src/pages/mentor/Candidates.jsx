import { ClipboardCheck, Laptop, Users } from 'lucide-react'
import { useState } from 'react'
import { listMyCandidates } from '../../api/profiles.js'
import { CandidateCell } from '../../components/AttendanceTable.jsx'
import { SearchField } from '../../components/Filters.jsx'
import { PageHeader } from '../../components/layout/AppLayout.jsx'
import Badge from '../../components/ui/Badge.jsx'
import Button from '../../components/ui/Button.jsx'
import { Card } from '../../components/ui/Card.jsx'
import { EmptyState, ErrorState, SkeletonRows } from '../../components/ui/Feedback.jsx'
import { Table } from '../../components/ui/Table.jsx'
import { useAsync } from '../../hooks/useAsync.js'
import { friendlyError } from '../../lib/errors.js'
import { formatDate } from '../../lib/time.js'

export default function Candidates() {
  const { data, error, loading, reload } = useAsync(listMyCandidates, [])
  const [search, setSearch] = useState('')
  const q = search.trim().toLowerCase()
  const rows = (data ?? []).filter((c) => !q || `${c.full_name} ${c.candidate_identifier ?? ''} ${c.email}`.toLowerCase().includes(q))

  const columns = [
    { key: 'name', header: 'Candidate', render: (c) => <CandidateCell name={c.full_name} id={c.candidate_identifier} /> },
    { key: 'email', header: 'Email', render: (c) => <a className="text-muted hover:text-purple" href={`mailto:${c.email}`}>{c.email}</a> },
    { key: 'cohort', header: 'Cohort', render: (c) => c.cohort ?? '—' },
    { key: 'since', header: 'Joined', render: (c) => formatDate(c.created_at) },
    { key: 'status', header: 'Account', render: (c) => <Badge tone={c.status === 'active' ? 'approved' : 'neutral'}>{c.status === 'active' ? 'Active' : 'Inactive'}</Badge> },
    { key: 'act', header: <span className="sr-only">Records</span>, className: 'text-right whitespace-nowrap', render: (c) => (
      <span className="inline-flex gap-1">
        <Button size="s" variant="ghost" icon={ClipboardCheck} to={`/mentor/attendance?candidate=${c.id}`} aria-label={`${c.full_name}'s attendance`}>Attendance</Button>
        <Button size="s" variant="ghost" icon={Laptop} to={`/mentor/wfh?search=${encodeURIComponent(c.full_name)}`} aria-label={`${c.full_name}'s WFH requests`}>WFH</Button>
      </span>
    ) },
  ]

  return (
    <>
      <PageHeader title="Candidates" subtitle="Candidates assigned to you." />
      <Card>
        <div className="border-b border-line p-4 sm:px-6"><SearchField value={search} onChange={setSearch} placeholder="Search by name, ID or email" /></div>
        {error ? <ErrorState message={friendlyError(error)} onRetry={reload} /> : loading && !data ? <SkeletonRows rows={6} /> :
          rows.length === 0 ? (
            <EmptyState icon={Users} title={q ? 'No candidates match' : 'No candidates assigned yet'}>
              {!q && 'CAPACITI will assign candidates to you.'}
            </EmptyState>
          ) : <Table columns={columns} rows={rows} caption="Assigned candidates" />}
      </Card>
    </>
  )
}
