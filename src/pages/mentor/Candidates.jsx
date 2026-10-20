import { ClipboardCheck, Laptop, Send, UserPlus, Users } from 'lucide-react'
import { useState } from 'react'
import { inviteCandidate, listMyCandidates } from '../../api/profiles.js'
import { CandidateCell } from '../../components/AttendanceTable.jsx'
import { SearchField } from '../../components/Filters.jsx'
import { PageHeader } from '../../components/layout/AppLayout.jsx'
import { useToast } from '../../components/Toast.jsx'
import Badge from '../../components/ui/Badge.jsx'
import Button from '../../components/ui/Button.jsx'
import { Card } from '../../components/ui/Card.jsx'
import { Alert, EmptyState, ErrorState, SkeletonRows } from '../../components/ui/Feedback.jsx'
import { Input } from '../../components/ui/Field.jsx'
import Modal from '../../components/ui/Modal.jsx'
import { Table } from '../../components/ui/Table.jsx'
import { useAsync } from '../../hooks/useAsync.js'
import { friendlyError } from '../../lib/errors.js'
import { formatDate } from '../../lib/time.js'
import { EMAIL_RE } from '../../lib/validation.js'

function InviteModal({ open, onClose, onInvited }) {
  const toast = useToast()
  const empty = { full_name: '', email: '', candidate_identifier: '', cohort: '' }
  const [form, setForm] = useState(empty)
  const [errors, setErrors] = useState({})
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const close = () => { setForm(empty); setErrors({}); setError(null); onClose() }
  const set = (k) => (e) => { setForm((f) => ({ ...f, [k]: e.target.value })); setErrors((x) => ({ ...x, [k]: undefined })) }

  async function submit(e) {
    e.preventDefault()
    const v = {}
    if (form.full_name.trim().length < 2) v.full_name = 'Enter the candidate’s full name'
    if (!EMAIL_RE.test(form.email.trim())) v.email = 'Enter a valid email address'
    if (!form.candidate_identifier.trim()) v.candidate_identifier = 'Candidate ID is required'
    setErrors(v)
    if (Object.keys(v).length) return
    setBusy(true)
    setError(null)
    try {
      await inviteCandidate(form)
      toast('success', 'Invitation sent', `${form.email.trim()} will receive an email to set their password.`)
      onInvited()
      close()
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={close} title="Invite a candidate" description="They'll be assigned to you and receive an email to set a password.">
      <form onSubmit={submit} noValidate className="flex flex-col gap-5 text-left">
        {error && <Alert type="error" title={error} />}
        <Input label="Full name" required value={form.full_name} onChange={set('full_name')} error={errors.full_name} />
        <Input label="Email address" required type="email" value={form.email} onChange={set('email')} error={errors.email} />
        <Input label="Candidate ID" required value={form.candidate_identifier} onChange={set('candidate_identifier')}
          error={errors.candidate_identifier} placeholder="CAP-2026-0001" />
        <Input label="Programme / cohort" value={form.cohort} onChange={set('cohort')} placeholder="e.g. Software Development · Aug 2026" />
        <div className="flex gap-3 [&>*]:flex-1">
          <Button variant="secondary" onClick={close}>Cancel</Button>
          <Button type="submit" icon={Send} loading={busy}>Send invite</Button>
        </div>
      </form>
    </Modal>
  )
}

export default function Candidates() {
  const { data, error, loading, reload } = useAsync(listMyCandidates, [])
  const [search, setSearch] = useState('')
  const [inviting, setInviting] = useState(false)
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
      <PageHeader title="Candidates" subtitle="Candidates assigned to you." actions={<Button icon={UserPlus} onClick={() => setInviting(true)}>Invite candidate</Button>} />
      <Card>
        <div className="border-b border-line p-4 sm:px-6"><SearchField value={search} onChange={setSearch} placeholder="Search by name, ID or email" /></div>
        {error ? <ErrorState message={friendlyError(error)} onRetry={reload} /> : loading && !data ? <SkeletonRows rows={6} /> :
          rows.length === 0 ? (
            <EmptyState icon={Users} title={q ? 'No candidates match' : 'No candidates assigned yet'}
              action={!q && <Button size="s" icon={UserPlus} onClick={() => setInviting(true)}>Invite candidate</Button>} />
          ) : <Table columns={columns} rows={rows} caption="Assigned candidates" />}
      </Card>
      <InviteModal open={inviting} onClose={() => setInviting(false)} onInvited={reload} />
    </>
  )
}
