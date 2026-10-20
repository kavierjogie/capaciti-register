import { Laptop, Plus } from 'lucide-react'
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { exportWfh, listWfh } from '../../api/wfh.js'
import { useAuth } from '../../auth/AuthProvider.jsx'
import { DateRange, ExportButton, FilterBar, FilterSelect, useUrlFilters } from '../../components/Filters.jsx'
import { PageHeader } from '../../components/layout/AppLayout.jsx'
import Button from '../../components/ui/Button.jsx'
import { Card } from '../../components/ui/Card.jsx'
import { EmptyState, ErrorState, SkeletonRows } from '../../components/ui/Feedback.jsx'
import Modal from '../../components/ui/Modal.jsx'
import { Pagination } from '../../components/ui/Table.jsx'
import { WfhDetails, WfhRequestModal, WfhTable } from '../../components/Wfh.jsx'
import { useAsync } from '../../hooks/useAsync.js'
import { friendlyError } from '../../lib/errors.js'
import { WFH_COLUMNS } from '../../lib/reports.js'

export const STATUS_OPTIONS = [['pending', 'Pending'], ['approved', 'Approved'], ['rejected', 'Rejected']]
const PAGE_SIZE = 20

export default function MyWfhRequests() {
  const { profile } = useAuth()
  const [params, setParams] = useSearchParams()
  const f = useUrlFilters(params, setParams, ['status', 'from', 'to'])
  const query = { ...f.filters, candidateId: profile.id }
  const { data, error, loading, reload } = useAsync(() => listWfh(query, { page: f.page, pageSize: PAGE_SIZE }), [params.toString()])
  const [creating, setCreating] = useState(false)
  const [viewing, setViewing] = useState(null)

  return (
    <>
      <PageHeader title="WFH requests" subtitle="Request to work from home and track each decision."
        actions={<>
          <ExportButton kind="my-wfh-requests" filters={query} fetchRows={exportWfh} columns={WFH_COLUMNS} />
          <Button icon={Plus} onClick={() => setCreating(true)}>New WFH Request</Button>
        </>} />
      <Card>
        <FilterBar active={f.active} onClear={f.clear}>
          <FilterSelect label="Status" value={f.filters.status} onChange={(status) => f.set({ status })} options={STATUS_OPTIONS} />
          <DateRange label="Requested date" from={f.filters.from} to={f.filters.to} onChange={f.set} />
        </FilterBar>
        {error ? <ErrorState message={friendlyError(error)} onRetry={reload} /> : loading && !data ? <SkeletonRows rows={5} /> :
          data.data.length === 0 ? (
            <EmptyState icon={Laptop} title={f.active ? 'No requests match these filters' : 'No WFH requests yet'}
              action={f.active ? <Button variant="secondary" size="s" onClick={f.clear}>Clear filters</Button> : <Button size="s" icon={Plus} onClick={() => setCreating(true)}>New WFH Request</Button>} />
          ) : (
            <div className={loading ? 'opacity-60' : ''} aria-busy={loading}>
              <WfhTable rows={data.data} onOpen={setViewing} />
              <Pagination page={f.page} pageSize={PAGE_SIZE} total={data.count} onPage={f.setPage} />
            </div>
          )}
      </Card>
      <WfhRequestModal open={creating} onClose={() => setCreating(false)} onSubmitted={reload} />
      <Modal open={Boolean(viewing)} onClose={() => setViewing(null)} title="WFH request" footer={<Button variant="secondary" onClick={() => setViewing(null)}>Close</Button>}>
        {viewing && <WfhDetails req={viewing} />}
      </Modal>
    </>
  )
}
