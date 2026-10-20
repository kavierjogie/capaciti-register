import { CalendarDays } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { exportAttendance, listAttendance } from '../../api/attendance.js'
import { useAuth } from '../../auth/AuthProvider.jsx'
import AttendanceTable from '../../components/AttendanceTable.jsx'
import { DateRange, ExportButton, FilterBar, FilterSelect, useUrlFilters } from '../../components/Filters.jsx'
import { PageHeader } from '../../components/layout/AppLayout.jsx'
import Button from '../../components/ui/Button.jsx'
import { Card } from '../../components/ui/Card.jsx'
import { EmptyState, ErrorState, SkeletonRows } from '../../components/ui/Feedback.jsx'
import { Pagination } from '../../components/ui/Table.jsx'
import { useAsync } from '../../hooks/useAsync.js'
import { friendlyError } from '../../lib/errors.js'
import { ATTENDANCE_COLUMNS } from '../../lib/reports.js'

export const MODE_OPTIONS = [['office', 'Office'], ['wfh', 'Working From Home']]
export const COMPLETION_OPTIONS = [['complete', 'Checked out'], ['open', 'No check-out']]
const PAGE_SIZE = 20

export default function AttendanceHistory() {
  const { profile } = useAuth()
  const [params, setParams] = useSearchParams()
  const f = useUrlFilters(params, setParams, ['from', 'to', 'mode', 'completion'])
  const query = { ...f.filters, candidateId: profile.id }
  const { data, error, loading, reload } = useAsync(() => listAttendance(query, { page: f.page, pageSize: PAGE_SIZE }), [params.toString()])

  return (
    <>
      <PageHeader title="Attendance history" subtitle="Every day you've registered, newest first."
        actions={<ExportButton kind="my-attendance" filters={query} fetchRows={exportAttendance} columns={ATTENDANCE_COLUMNS} />} />
      <Card>
        <FilterBar active={f.active} onClear={f.clear}>
          <DateRange from={f.filters.from} to={f.filters.to} onChange={f.set} />
          <FilterSelect label="Status" value={f.filters.mode} onChange={(mode) => f.set({ mode })} options={MODE_OPTIONS} />
          <FilterSelect label="Register" value={f.filters.completion} onChange={(completion) => f.set({ completion })} options={COMPLETION_OPTIONS} />
        </FilterBar>
        {error ? <ErrorState message={friendlyError(error)} onRetry={reload} /> : loading && !data ? <SkeletonRows rows={6} /> :
          data.data.length === 0 ? (
            <EmptyState icon={CalendarDays} title={f.active ? 'No records match these filters' : 'No attendance yet'}
              action={f.active ? <Button variant="secondary" size="s" onClick={f.clear}>Clear filters</Button> : <Button size="s" to="/candidate/register">Register attendance</Button>}>
              {!f.active && 'Your register entries will show up here.'}
            </EmptyState>
          ) : (
            <div className={loading ? 'opacity-60 transition-opacity' : ''} aria-busy={loading}>
              <AttendanceTable rows={data.data} />
              <Pagination page={f.page} pageSize={PAGE_SIZE} total={data.count} onPage={f.setPage} />
            </div>
          )}
      </Card>
    </>
  )
}
