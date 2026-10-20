import { CalendarDays, CheckCircle2, ChevronRight, CircleDashed, ClipboardCheck, Clock, Laptop, MapPin, Plus, TrendingUp } from 'lucide-react'
import { useState } from 'react'
import { listAttendance } from '../../api/attendance.js'
import { getWfhForDate, listWfh } from '../../api/wfh.js'
import { useAuth } from '../../auth/AuthProvider.jsx'
import { PageHeader } from '../../components/layout/AppLayout.jsx'
import Badge, { ModeBadge, StatusBadge } from '../../components/ui/Badge.jsx'
import Button from '../../components/ui/Button.jsx'
import { Card, CardHeader, StatCard } from '../../components/ui/Card.jsx'
import { EmptyState, ErrorState, SkeletonRows } from '../../components/ui/Feedback.jsx'
import { WfhDetails, WfhRequestModal } from '../../components/Wfh.jsx'
import Modal from '../../components/ui/Modal.jsx'
import { useAsync } from '../../hooks/useAsync.js'
import { registerStatus, sumHours } from '../../lib/attendance.js'
import { friendlyError } from '../../lib/errors.js'
import { formatDate, formatDay, formatFullDate, formatHours, formatMonth, formatTime, greeting, isLate, sastToday, weekStart } from '../../lib/time.js'

async function loadDashboard(uid) {
  const today = sastToday()
  const [att, wfh, pending, todaysWfh] = await Promise.all([
    listAttendance({ candidateId: uid }, { pageSize: 31 }),
    listWfh({ candidateId: uid }, { pageSize: 4 }),
    listWfh({ candidateId: uid, status: 'pending' }, { pageSize: 1 }),
    getWfhForDate(uid, today),
  ])
  const rows = att.data
  const month = today.slice(0, 7)
  const monthRows = rows.filter((r) => r.attendance_date.startsWith(month))
  return {
    today: rows.find((r) => r.attendance_date === today) ?? null,
    recent: rows.slice(0, 5),
    weekHours: sumHours(rows.filter((r) => r.attendance_date >= weekStart(today))),
    monthDays: monthRows.length,
    monthLate: monthRows.filter((r) => isLate(r.check_in_at)).length,
    wfh: wfh.data,
    pendingCount: pending.count,
    todaysWfh,
  }
}

function TodayCard({ today, todaysWfh }) {
  if (!today)
    return (
      <Card className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center">
        <span className="grid size-[52px] shrink-0 place-items-center rounded-[14px] bg-warning-surface text-warning"><CircleDashed className="size-7" aria-hidden /></span>
        <div className="flex-1">
          <p className="label-caps">Today's attendance</p>
          <p className="text-lg font-semibold">You haven't registered today</p>
          <p className="text-xs text-muted">
            {todaysWfh?.status === 'approved' ? `WFH approved by ${todaysWfh.reviewer_name}` : 'Register as soon as you start work.'}
          </p>
        </div>
        <Button to="/candidate/register" icon={ClipboardCheck}>Register Attendance</Button>
      </Card>
    )

  const status = registerStatus(today)
  const done = Boolean(today.check_out_at)
  const where = today.work_mode === 'wfh' ? 'working from home' : 'at the office'
  return (
    <Card className="flex flex-col gap-6 p-6 lg:flex-row lg:items-center">
      <div className="flex flex-1 items-center gap-4">
        <span className="grid size-[52px] shrink-0 place-items-center rounded-[14px] bg-success-surface text-success"><CheckCircle2 className="size-7" aria-hidden /></span>
        <div>
          <p className="label-caps">Today's attendance</p>
          <p className="text-lg leading-[26px] font-semibold">{done ? `You've checked out · ${formatHours(today.hours)}` : `You're checked in and ${where}`}</p>
          <p className="text-xs text-muted">
            Registered at {formatTime(today.check_in_at)}
            {today.work_mode === 'wfh' && (today.wfh_approved && todaysWfh ? ` · WFH approved by ${todaysWfh.reviewer_name}` : ' · No approved WFH request for today')}
          </p>
        </div>
      </div>
      <span className="hidden h-[98px] w-px bg-line lg:block" aria-hidden />
      <dl className="grid grid-cols-2 gap-x-8 gap-y-4 text-xs sm:grid-cols-4 lg:flex">
        <div><dt className="mb-1 text-muted">Current status</dt><dd><ModeBadge mode={today.work_mode} /></dd></div>
        <div><dt className="mb-1 text-muted">Check-in time</dt><dd className="text-sm font-medium">{formatTime(today.check_in_at)}</dd></div>
        <div><dt className="mb-1 text-muted">Today's location</dt>
          <dd className="flex items-center gap-1.5 text-sm font-medium"><MapPin className="size-4 text-salmon" aria-hidden />{today.location_note ?? '—'}</dd></div>
        <div><dt className="mb-1 text-muted">Register</dt><dd><Badge tone={status.tone}>{status.label}</Badge></dd></div>
      </dl>
    </Card>
  )
}

export default function CandidateDashboard() {
  const { profile } = useAuth()
  const { data, error, loading, reload } = useAsync(() => loadDashboard(profile.id), [profile.id])
  const [newWfh, setNewWfh] = useState(false)
  const [viewing, setViewing] = useState(null)
  const first = profile.full_name.split(' ')[0]
  const today = sastToday()

  return (
    <>
      <PageHeader
        title={`${greeting()}, ${first}`}
        subtitle={`${formatFullDate(today)} · Here's your register and WFH overview.`}
        actions={<>
          <Button variant="secondary" icon={Laptop} onClick={() => setNewWfh(true)}>Submit WFH Request</Button>
          <Button to="/candidate/register" icon={ClipboardCheck}>Register Attendance</Button>
        </>}
      />
      {error ? <Card><ErrorState message={friendlyError(error)} onRetry={reload} /></Card> : (
        <div className="flex flex-col gap-6">
          {loading && !data ? <Card><SkeletonRows rows={2} /></Card> : <TodayCard today={data.today} todaysWfh={data.todaysWfh} />}

          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Today's Status" icon={CheckCircle2} tone="success" loading={!data}
              value={!data?.today ? 'Not registered' : data.today.check_out_at ? 'Checked out' : 'Checked in'}
              caption={data?.today ? `${data.today.work_mode === 'wfh' ? 'Working from home' : 'At the office'} since ${formatTime(data.today.check_in_at)}` : 'No register entry yet today'} />
            <StatCard label="Hours Logged" icon={Clock} loading={!data} value={formatHours(data?.weekHours)} caption="This week · completed days" />
            <StatCard label="Pending WFH Requests" icon={Laptop} tone="warning" loading={!data} value={data?.pendingCount ?? 0} caption="Awaiting Tech Champion review" />
            <StatCard label="Days Registered" icon={TrendingUp} tone="kadet" loading={!data} value={data?.monthDays ?? 0}
              caption={`${formatMonth(today)}${data?.monthLate ? ` · ${data.monthLate} late check-in${data.monthLate > 1 ? 's' : ''}` : ''}`} />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card aria-labelledby="recent-att">
              <CardHeader id="recent-att" title="Recent attendance" subtitle="Your last five register entries" actionTo="/candidate/attendance" />
              {!data ? <SkeletonRows /> : data.recent.length === 0 ? (
                <EmptyState icon={CalendarDays} title="No register entries yet">Your attendance will appear here after your first check-in.</EmptyState>
              ) : (
                <ul className="px-5 pb-3">
                  {data.recent.map((r) => (
                    <li key={r.id} className="flex min-h-[60px] items-center gap-3 border-t border-line py-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{formatDay(r.attendance_date)}</p>
                        <p className="truncate text-xs text-muted">
                          {formatTime(r.check_in_at)} – {r.check_out_at ? formatTime(r.check_out_at) : '…'}{r.location_note && ` · ${r.location_note}`}
                        </p>
                      </div>
                      <ModeBadge mode={r.work_mode} />
                      <span className="w-14 text-right font-medium">{formatHours(r.hours)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card aria-labelledby="recent-wfh">
              <CardHeader id="recent-wfh" title="Recent WFH requests" subtitle="Track the status of your requests" actionTo="/candidate/wfh" />
              {!data ? <SkeletonRows /> : (
                <>
                  {data.wfh.length === 0 ? (
                    <EmptyState icon={Laptop} title="No WFH requests yet">Need to work from home? Submit a request for your Tech Champion to review.</EmptyState>
                  ) : (
                    <ul className="px-5">
                      {data.wfh.map((w) => (
                        <li key={w.id} className="border-t border-line">
                          <button onClick={() => setViewing(w)} className="flex min-h-[60px] w-full items-center gap-3 py-2 text-left hover:bg-bg">
                            <span className="min-w-0 flex-1">
                              <span className="block font-medium">{formatDate(w.requested_date)}</span>
                              <span className="block truncate text-xs text-muted">{w.reason} · submitted {formatDate(w.submitted_at)}</span>
                            </span>
                            <StatusBadge status={w.status} />
                            <ChevronRight className="size-[18px] text-muted" aria-hidden />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="px-5 pb-4"><Button variant="ghost" size="s" icon={Plus} onClick={() => setNewWfh(true)}>New WFH Request</Button></div>
                </>
              )}
            </Card>
          </div>
        </div>
      )}
      <WfhRequestModal open={newWfh} onClose={() => setNewWfh(false)} onSubmitted={reload} />
      <Modal open={Boolean(viewing)} onClose={() => setViewing(null)} title="WFH request" footer={<Button variant="secondary" onClick={() => setViewing(null)}>Close</Button>}>
        {viewing && <WfhDetails req={viewing} />}
      </Modal>
    </>
  )
}
