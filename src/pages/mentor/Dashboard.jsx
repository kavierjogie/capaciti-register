import { CheckCircle2, ChevronRight, ClipboardCheck, Inbox, Laptop, Users, XCircle } from 'lucide-react'
import { useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { listAttendance } from '../../api/attendance.js'
import { listMyCandidates } from '../../api/profiles.js'
import { countByStatus, listWfh } from '../../api/wfh.js'
import { useAuth } from '../../auth/AuthProvider.jsx'
import { CandidateCell } from '../../components/AttendanceTable.jsx'
import { PageHeader } from '../../components/layout/AppLayout.jsx'
import ReviewModal from '../../components/ReviewModal.jsx'
import Badge, { ModeBadge, StatusBadge } from '../../components/ui/Badge.jsx'
import Button from '../../components/ui/Button.jsx'
import { Card, CardHeader, StatCard } from '../../components/ui/Card.jsx'
import { EmptyState, ErrorState, SkeletonRows } from '../../components/ui/Feedback.jsx'
import { useAsync } from '../../hooks/useAsync.js'
import { registerStatus } from '../../lib/attendance.js'
import { friendlyError } from '../../lib/errors.js'
import { formatDate, formatDayLong, formatFullDate, formatMonth, formatTime, greeting, monthBounds, sastToday } from '../../lib/time.js'

async function load() {
  const today = sastToday()
  const [candidates, todayAtt, pending, month] = await Promise.all([
    listMyCandidates(),
    listAttendance({ from: today, to: today }, { pageSize: 500 }),
    listWfh({ status: 'pending' }, { pageSize: 5 }),
    countByStatus(monthBounds(today)),
  ])
  const byCandidate = new Map(todayAtt.data.map((r) => [r.candidate_id, r]))
  const register = candidates.filter((c) => c.status === 'active').map((c) => ({ ...c, rec: byCandidate.get(c.id) }))
  // Not checked in first, then still-open, then done.
  const rank = (r) => (!r.rec ? 0 : !r.rec.check_out_at ? 1 : 2)
  register.sort((a, b) => rank(a) - rank(b) || a.full_name.localeCompare(b.full_name))
  return {
    candidates: register,
    checkedIn: todayAtt.count,
    notIn: register.filter((r) => !r.rec).length,
    open: register.filter((r) => r.rec && !r.rec.check_out_at).length,
    wfhToday: todayAtt.data.filter((r) => r.work_mode === 'wfh').length,
    pending: pending.data,
    pendingCount: pending.count,
    month,
  }
}

export default function MentorDashboard() {
  const { profile } = useAuth()
  const { refreshPending } = useOutletContext()
  const { data, error, reload } = useAsync(load, [])
  const [reviewing, setReviewing] = useState(null)
  const today = sastToday()
  const monthName = formatMonth(today)

  return (
    <>
      <PageHeader title={`${greeting()}, ${profile.full_name.split(' ')[0]}`} subtitle={`${formatFullDate(today)} · Here's your candidates' day.`}
        actions={<>
          <Button variant="secondary" icon={ClipboardCheck} to="/mentor/attendance">Attendance</Button>
          <Button icon={Laptop} to="/mentor/wfh?status=pending">Review requests</Button>
        </>} />
      {error ? <Card><ErrorState message={friendlyError(error)} onRetry={reload} /></Card> : (
        <div className="flex flex-col gap-6">
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Assigned Candidates" icon={Users} tone="kadet" loading={!data} value={data?.candidates.length}
              caption={data ? `${data.checkedIn} registered today · ${data.wfhToday} WFH` : '…'} />
            <StatCard label="Pending WFH Requests" icon={Laptop} tone="warning" loading={!data} value={data?.pendingCount} caption="Awaiting your review" />
            <StatCard label="Approved" icon={CheckCircle2} tone="success" loading={!data} value={data?.month.approved} caption={`Requested dates in ${monthName}`} />
            <StatCard label="Rejected" icon={XCircle} tone="error" loading={!data} value={data?.month.rejected} caption={`Requested dates in ${monthName}`} />
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
            <Card aria-labelledby="queue">
              <CardHeader id="queue" title="Pending approval queue" subtitle="Oldest requested dates first" actionTo="/mentor/wfh?status=pending" />
              {!data ? <SkeletonRows /> : data.pending.length === 0 ? (
                <EmptyState icon={Inbox} title="No pending requests">You're all caught up.</EmptyState>
              ) : (
                <ul className="px-5 pb-3">
                  {data.pending.map((w) => (
                    <li key={w.id} className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-2 border-t border-line py-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_auto_auto]">
                      <CandidateCell name={w.full_name} id={w.candidate_identifier} />
                      <div className="col-span-2 row-start-2 text-xs sm:col-span-1 sm:row-start-auto">
                        <p className="text-sm font-medium">{formatDayLong(w.requested_date)}</p>
                        <p className="text-muted">{w.reason} · submitted {formatDate(w.submitted_at)}</p>
                      </div>
                      <StatusBadge status={w.status} />
                      <Button size="s" onClick={() => setReviewing(w)} aria-label={`Review ${w.full_name}'s request`}>Review</Button>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card aria-labelledby="today-reg">
              <CardHeader id="today-reg" title="Today's register"
                subtitle={data ? `${data.notIn} not checked in · ${data.open} not checked out yet` : 'Loading…'} actionTo={`/mentor/attendance?from=${today}&to=${today}`} />
              {!data ? <SkeletonRows /> : data.candidates.length === 0 ? (
                <EmptyState icon={Users} title="No candidates assigned">CAPACITI will assign candidates to you.</EmptyState>
              ) : (
                <ul className="max-h-[420px] overflow-y-auto px-5 pb-3">
                  {data.candidates.map((c) => {
                    const s = c.rec && registerStatus(c.rec)
                    return (
                      <li key={c.id} className="border-t border-line">
                        <Link to={`/mentor/attendance?candidate=${c.id}`} className="flex items-center gap-3 py-2.5 hover:bg-bg">
                          <div className="min-w-0 flex-1"><CandidateCell name={c.full_name} id={c.candidate_identifier} /></div>
                          {c.rec ? (
                            <>
                              <span className="hidden text-xs text-muted sm:block">{formatTime(c.rec.check_in_at)}–{c.rec.check_out_at ? formatTime(c.rec.check_out_at) : '…'}</span>
                              <ModeBadge mode={c.rec.work_mode} />
                              <Badge tone={s.tone}>{s.label}</Badge>
                            </>
                          ) : <Badge tone="missing">Not checked in</Badge>}
                          <ChevronRight className="size-4 text-muted" aria-hidden />
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              )}
            </Card>
          </div>
        </div>
      )}
      <ReviewModal key={reviewing?.id} request={reviewing} onClose={() => setReviewing(null)} onDecided={() => { reload(); refreshPending() }} />
    </>
  )
}
