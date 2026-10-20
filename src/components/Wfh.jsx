import { CalendarCheck, Send } from 'lucide-react'
import { useState } from 'react'
import { submitWfh } from '../api/wfh.js'
import { friendlyError } from '../lib/errors.js'
import { addDays, formatDateTime, formatDayLong, formatFullDate, sastToday } from '../lib/time.js'
import { validateWfh, WFH_REASONS } from '../lib/validation.js'
import { CandidateCell } from './AttendanceTable.jsx'
import { useToast } from './Toast.jsx'
import { StatusBadge } from './ui/Badge.jsx'
import Button from './ui/Button.jsx'
import { Alert } from './ui/Feedback.jsx'
import { Input, Select, Textarea } from './ui/Field.jsx'
import Modal, { ModalIcon } from './ui/Modal.jsx'
import { Table } from './ui/Table.jsx'

export function WfhTable({ rows, showCandidate, onOpen, actionLabel = 'View' }) {
  const columns = [
    showCandidate && { key: 'c', header: 'Candidate', render: (r) => <CandidateCell name={r.full_name} id={r.candidate_identifier} /> },
    { key: 'date', header: 'Requested date', render: (r) => formatDayLong(r.requested_date), className: 'whitespace-nowrap' },
    { key: 'reason', header: 'Reason', render: (r) => r.reason },
    { key: 'sub', header: 'Submitted', render: (r) => <span className="text-muted">{formatDateTime(r.submitted_at)}</span>, className: 'whitespace-nowrap' },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'act', header: <span className="sr-only">Actions</span>, className: 'text-right',
      render: (r) => <Button size="s" variant={r.status === 'pending' && actionLabel !== 'View' ? 'primary' : 'ghost'} onClick={(e) => { e.stopPropagation(); onOpen(r) }}
        aria-label={`${r.status === 'pending' ? actionLabel : 'View'} request for ${formatDayLong(r.requested_date)}`}>
        {r.status === 'pending' ? actionLabel : 'View'}</Button> },
  ].filter(Boolean)
  return <Table columns={columns} rows={rows} onRowClick={onOpen} caption="Work-from-home requests" />
}

const Row = ({ label, children }) => (
  <div className="flex flex-col gap-0.5 border-t border-line py-3 first:border-0 sm:flex-row sm:gap-4">
    <dt className="w-36 shrink-0 text-muted">{label}</dt>
    <dd className="min-w-0 break-words">{children}</dd>
  </div>
)

export function WfhDetails({ req, showCandidate }) {
  return (
    <dl className="rounded-[10px] bg-bg px-4 py-1 text-left">
      {showCandidate && <Row label="Candidate">{req.full_name}{req.candidate_identifier && ` · ${req.candidate_identifier}`}</Row>}
      <Row label="Requested date">{formatFullDate(req.requested_date)}</Row>
      <Row label="Reason">{req.reason}</Row>
      {req.details && <Row label="Details"><span className="whitespace-pre-wrap">{req.details}</span></Row>}
      <Row label="Submitted">{formatDateTime(req.submitted_at)}</Row>
      <Row label="Status"><StatusBadge status={req.status} /></Row>
      {req.reviewed_at && <Row label="Decided">{formatDateTime(req.reviewed_at)}{req.reviewer_name && ` by ${req.reviewer_name}`}</Row>}
      {req.decision_comment && <Row label={req.status === 'rejected' ? 'Reason given' : 'Comment'}>{req.decision_comment}</Row>}
    </dl>
  )
}

export function WfhRequestModal({ open, onClose, onSubmitted }) {
  const toast = useToast()
  const today = sastToday()
  const empty = { date: '', reason: '', details: '' }
  const [form, setForm] = useState(empty)
  const [errors, setErrors] = useState({})
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(null)

  const close = () => { setForm(empty); setErrors({}); setError(null); setDone(null); onClose() }
  const set = (k) => (e) => { setForm((f) => ({ ...f, [k]: e.target.value })); setErrors((x) => ({ ...x, [k]: undefined })) }

  async function submit(e) {
    e.preventDefault()
    const v = validateWfh(form, today)
    setErrors(v)
    if (Object.keys(v).length) return
    setBusy(true)
    setError(null)
    try {
      const req = await submitWfh(form)
      setDone(req)
      toast('success', 'WFH request submitted', 'Your Tech Champion has been notified.')
      onSubmitted?.(req)
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setBusy(false)
    }
  }

  if (done)
    return (
      <Modal open={open} onClose={close} title="Request submitted" description="Your Tech Champion will review it soon."
        icon={<ModalIcon icon={CalendarCheck} />} footer={<Button onClick={close}>Done</Button>}>
        <WfhDetails req={done} />
      </Modal>
    )

  return (
    <Modal open={open} onClose={close} title="New WFH request" description="Requests are reviewed by your Tech Champion.">
      <form id="wfh-form" onSubmit={submit} noValidate className="flex flex-col gap-5 text-left">
        {error && <Alert type="error" title={error} />}
        <Input label="Date" required type="date" min={today} max={addDays(today, 90)} value={form.date} onChange={set('date')}
          error={errors.date} hint="Weekdays only, up to 90 days ahead" />
        <Select label="Reason" required value={form.reason} onChange={set('reason')} error={errors.reason}>
          <option value="" disabled>Select a reason</option>
          {WFH_REASONS.map((r) => <option key={r}>{r}</option>)}
        </Select>
        <Textarea label="Additional details" required={form.reason === 'Other'} maxLength={1000} value={form.details}
          onChange={set('details')} error={errors.details} placeholder="Anything your Tech Champion should know" />
        <div className="flex gap-3 [&>*]:flex-1">
          <Button variant="secondary" onClick={close}>Cancel</Button>
          <Button type="submit" icon={Send} loading={busy}>Submit request</Button>
        </div>
      </form>
    </Modal>
  )
}
