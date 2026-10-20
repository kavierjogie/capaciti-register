import { Inbox } from 'lucide-react'
import { useState } from 'react'
import { useOutletContext, useSearchParams } from 'react-router-dom'
import { exportWfh, listWfh } from '../../api/wfh.js'
import { DateRange, ExportButton, FilterBar, FilterSelect, SearchField, useUrlFilters } from '../../components/Filters.jsx'
import { PageHeader } from '../../components/layout/AppLayout.jsx'
import ReviewModal from '../../components/ReviewModal.jsx'
import { Card } from '../../components/ui/Card.jsx'
import { EmptyState, ErrorState, SkeletonRows } from '../../components/ui/Feedback.jsx'
import { Pagination } from '../../components/ui/Table.jsx'
import { WfhTable } from '../../components/Wfh.jsx'
import { useAsync } from '../../hooks/useAsync.js'
import { friendlyError } from '../../lib/errors.js'
import { WFH_COLUMNS } from '../../lib/reports.js'
import { STATUS_OPTIONS } from '../candidate/WfhRequests.jsx'

const PAGE_SIZE = 25

export default function MentorWfhRequests() {
  const { refreshPending } = useOutletContext()
  const [params, setParams] = useSearchParams()
  const f = useUrlFilters(params, setParams, ['search', 'status', 'from', 'to', 'submittedFrom', 'submittedTo'])
  const { data, error, loading, reload } = useAsync(() => listWfh(f.filters, { page: f.page, pageSize: PAGE_SIZE }), [params.toString()])
  const [reviewing, setReviewing] = useState(null)
  const pendingOnly = f.filters.status === 'pending'

  return (
    <>
      <PageHeader title="WFH requests" subtitle="Review and track work-from-home requests from your candidates."
        actions={<ExportButton kind="wfh-requests" filters={f.filters} fetchRows={exportWfh} columns={WFH_COLUMNS} />} />
      <Card>
        <div className="flex gap-1 border-b border-line px-4 pt-3 sm:px-6" role="tablist" aria-label="Request view">
          {[['pending', 'Pending'], [undefined, 'All requests']].map(([status, label]) => {
            const active = status ? pendingOnly : !pendingOnly
            return (
              <button key={label} role="tab" aria-selected={active} onClick={() => f.set({ status })}
                className={`-mb-px border-b-2 px-3 pb-3 text-sm font-medium ${active ? 'border-purple text-purple' : 'border-transparent text-muted hover:text-ink'}`}>
                {label}
              </button>
            )
          })}
        </div>
        <FilterBar active={['search', 'from', 'to', 'submittedFrom', 'submittedTo'].some((k) => f.filters[k]) || (f.filters.status && !pendingOnly)}
          onClear={() => f.set({ search: undefined, from: undefined, to: undefined, submittedFrom: undefined, submittedTo: undefined, status: pendingOnly ? 'pending' : undefined })}>
          <SearchField value={f.filters.search} onChange={(search) => f.set({ search })} />
          {!pendingOnly && <FilterSelect label="Status" value={f.filters.status} onChange={(status) => f.set({ status })} options={STATUS_OPTIONS} />}
          <DateRange label="Requested" from={f.filters.from} to={f.filters.to} onChange={f.set} />
          <DateRange label="Submitted" from={f.filters.submittedFrom} to={f.filters.submittedTo}
            onChange={({ from, to }) => f.set({ submittedFrom: from, submittedTo: to })} />
        </FilterBar>
        {error ? <ErrorState message={friendlyError(error)} onRetry={reload} /> : loading && !data ? <SkeletonRows rows={6} /> :
          data.data.length === 0 ? (
            <EmptyState icon={Inbox} title={pendingOnly ? 'No pending requests' : 'No requests match'}>
              {pendingOnly ? "You're all caught up." : 'Try widening your filters.'}
            </EmptyState>
          ) : (
            <div className={loading ? 'opacity-60' : ''} aria-busy={loading}>
              <WfhTable rows={data.data} showCandidate onOpen={setReviewing} actionLabel="Review" />
              <Pagination page={f.page} pageSize={PAGE_SIZE} total={data.count} onPage={f.setPage} />
            </div>
          )}
      </Card>
      <ReviewModal key={reviewing?.id} request={reviewing} onClose={() => setReviewing(null)} onDecided={() => { reload(); refreshPending() }} />
    </>
  )
}
