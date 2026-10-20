import { CalendarDays } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { exportAttendance, listAttendance } from '../../api/attendance.js'
import { listMyCandidates } from '../../api/profiles.js'
import AttendanceTable from '../../components/AttendanceTable.jsx'
import { DateRange, ExportButton, FilterBar, FilterSelect, SearchField, useUrlFilters } from '../../components/Filters.jsx'
import { PageHeader } from '../../components/layout/AppLayout.jsx'
import Button from '../../components/ui/Button.jsx'
import { Card } from '../../components/ui/Card.jsx'
import { EmptyState, ErrorState, SkeletonRows } from '../../components/ui/Feedback.jsx'
import { Pagination } from '../../components/ui/Table.jsx'
import { useAsync } from '../../hooks/useAsync.js'
import { friendlyError } from '../../lib/errors.js'
import { ATTENDANCE_COLUMNS } from '../../lib/reports.js'
import { COMPLETION_OPTIONS, MODE_OPTIONS } from '../candidate/AttendanceHistory.jsx'

const PAGE_SIZE = 25

export default function MentorAttendance() {
  const [params, setParams] = useSearchParams()
  const f = useUrlFilters(params, setParams, ['search', 'candidate', 'from', 'to', 'mode', 'completion', 'cohort'])
  const { candidate, ...rest } = f.filters
  const query = { ...rest, candidateId: candidate }
  const { data: candidates = [] } = useAsync(listMyCandidates, [])
  const cohorts = [...new Set(candidates.map((c) => c.cohort).filter(Boolean))].sort()
  const { data, error, loading, reload } = useAsync(() => listAttendance(query, { page: f.page, pageSize: PAGE_SIZE }), [params.toString()])

  return (
    <>
      <PageHeader title="Attendance" subtitle="Register entries for your assigned candidates."
        actions={<ExportButton kind="attendance" filters={query} fetchRows={exportAttendance} columns={ATTENDANCE_COLUMNS} />} />
      <Card>
        <FilterBar active={f.active} onClear={f.clear}>
          <SearchField value={f.filters.search} onChange={(search) => f.set({ search })} />
          <FilterSelect label="Candidate" value={candidate} onChange={(c) => f.set({ candidate: c })}
            options={candidates.map((c) => [c.id, c.full_name])} />
          <DateRange from={f.filters.from} to={f.filters.to} onChange={f.set} />
          <FilterSelect label="Status" value={f.filters.mode} onChange={(mode) => f.set({ mode })} options={MODE_OPTIONS} />
          <FilterSelect label="Register" value={f.filters.completion} onChange={(completion) => f.set({ completion })} options={COMPLETION_OPTIONS} />
          {cohorts.length > 1 && <FilterSelect label="Cohort" value={f.filters.cohort} onChange={(cohort) => f.set({ cohort })} options={cohorts.map((c) => [c, c])} />}
        </FilterBar>
        {error ? <ErrorState message={friendlyError(error)} onRetry={reload} /> : loading && !data ? <SkeletonRows rows={8} /> :
          data.data.length === 0 ? (
            <EmptyState icon={CalendarDays} title={f.active ? 'No records match these filters' : 'No attendance recorded yet'}
              action={f.active && <Button variant="secondary" size="s" onClick={f.clear}>Clear filters</Button>}>
              {!f.active && 'Register entries from your candidates will appear here.'}
            </EmptyState>
          ) : (
            <div className={loading ? 'opacity-60' : ''} aria-busy={loading}>
              <AttendanceTable rows={data.data} showCandidate />
              <Pagination page={f.page} pageSize={PAGE_SIZE} total={data.count} onPage={f.setPage} />
            </div>
          )}
      </Card>
    </>
  )
}
