import { CalendarDays, ChevronRight, ClipboardCheck, History, House, Laptop, LogOut, Menu, User, Users, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { countByStatus } from '../../api/wfh.js'
import { useAuth } from '../../auth/AuthProvider.jsx'
import logo from '../../assets/logo-full-colour.png'
import { formatDayLong, sastToday } from '../../lib/time.js'
import Avatar from '../ui/Avatar.jsx'
import Notifications from './Notifications.jsx'

const NAV = {
  candidate: {
    label: 'Candidate portal',
    items: [
      { to: '/candidate', label: 'Dashboard', icon: House, end: true },
      { to: '/candidate/register', label: 'Register Attendance', icon: ClipboardCheck },
      { to: '/candidate/attendance', label: 'Attendance History', icon: History },
      { to: '/candidate/wfh', label: 'WFH Requests', icon: Laptop },
      { to: '/candidate/profile', label: 'Profile', icon: User },
    ],
  },
  mentor: {
    label: 'Tech Champion portal',
    items: [
      { to: '/mentor', label: 'Dashboard', icon: House, end: true },
      { to: '/mentor/attendance', label: 'Attendance', icon: ClipboardCheck },
      { to: '/mentor/wfh', label: 'WFH Requests', icon: Laptop, badge: 'pending' },
      { to: '/mentor/candidates', label: 'Candidates', icon: Users },
      { to: '/mentor/profile', label: 'Profile', icon: User },
    ],
  },
}
const roleLabel = (r) => (r === 'mentor' ? 'Tech Champion' : 'Candidate')

function Sidebar({ profile, pending, onNavigate, signOut }) {
  const nav = NAV[profile.role]
  const itemCls = ({ isActive }) =>
    `flex h-11 items-center gap-3 rounded-lg px-3 transition-colors ${isActive
      ? 'bg-purple-tint font-semibold text-purple' : 'font-medium text-kadet-80 hover:bg-bg'}`
  return (
    <div className="flex h-full flex-col gap-1 px-4 pt-6 pb-5">
      <Link to={nav.items[0].to} className="px-2 pt-1 pb-4" onClick={onNavigate}>
        <img src={logo} alt="CAPACITI home" width={200} height={40} />
      </Link>
      <p className="label-caps px-3 py-2">{nav.label}</p>
      <nav aria-label="Main" className="flex flex-col gap-1">
        {nav.items.map(({ to, label, icon: Icon, end, badge }) => (
          <NavLink key={to} to={to} end={end} className={itemCls} onClick={onNavigate}>
            <Icon className="size-5" aria-hidden />
            <span className="flex-1">{label}</span>
            {badge && pending > 0 && (
              <span className="rounded-full bg-salmon px-2 text-xs leading-[18px] font-medium text-white">
                {pending}<span className="sr-only"> pending</span>
              </span>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="flex-1" />
      <button onClick={signOut} className="flex h-11 items-center gap-3 rounded-lg px-3 font-medium text-kadet-80 hover:bg-bg">
        <LogOut className="size-5" aria-hidden /> Log out
      </button>
      <div className="flex items-center gap-2.5 rounded-[10px] bg-bg p-3">
        <Avatar name={profile.full_name} size="m" tone={profile.role === 'mentor' ? 'purple' : 'pink'} />
        <div className="min-w-0">
          <p className="truncate font-medium">{profile.full_name}</p>
          <p className="text-xs break-words text-muted">
            {roleLabel(profile.role)}{profile.candidate_identifier && ` · ${profile.candidate_identifier}`}
          </p>
        </div>
      </div>
    </div>
  )
}

export default function AppLayout() {
  const { profile, signOut } = useAuth()
  const [drawer, setDrawer] = useState(false)
  const [pending, setPending] = useState(0)
  const { pathname } = useLocation()
  const nav = NAV[profile.role]
  const current = [...nav.items].reverse().find((i) => pathname.startsWith(i.to))

  const refreshPending = useCallback(() => {
    if (profile.role === 'mentor') countByStatus().then((c) => setPending(c.pending)).catch(() => {})
  }, [profile.role])
  useEffect(refreshPending, [refreshPending])

  return (
    <div className="flex min-h-dvh">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-white focus:p-2">
        Skip to content
      </a>
      <aside className="sticky top-0 hidden h-dvh w-[264px] shrink-0 border-r border-line bg-white lg:block">
        <Sidebar profile={profile} pending={pending} signOut={signOut} />
      </aside>

      {drawer && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <div className="absolute inset-0 bg-kadet/55" onClick={() => setDrawer(false)} />
          <aside className="absolute inset-y-0 left-0 w-[280px] max-w-[85vw] bg-white shadow-modal">
            <button onClick={() => setDrawer(false)} className="absolute top-4 right-3 rounded p-1.5 text-muted" aria-label="Close menu">
              <X className="size-5" />
            </button>
            <Sidebar profile={profile} pending={pending} signOut={signOut} onNavigate={() => setDrawer(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-[68px] items-center gap-3 border-b border-line bg-white px-4 sm:px-8">
          <button onClick={() => setDrawer(true)} className="-ml-1 rounded-lg p-2 text-kadet lg:hidden" aria-label="Open menu">
            <Menu className="size-5" />
          </button>
          <nav aria-label="Breadcrumb" className="hidden items-center gap-2 text-sm sm:flex">
            <span className="text-muted">{nav.label.replace(' portal', ' Portal')}</span>
            <ChevronRight className="size-4 text-muted" aria-hidden />
            <span className="font-medium" aria-current="page">{current?.label}</span>
          </nav>
          <div className="flex-1" />
          <span className="hidden items-center gap-2 rounded-lg bg-bg px-3 py-2 text-xs font-medium md:flex">
            <CalendarDays className="size-4 text-muted" aria-hidden /> {formatDayLong(sastToday())}
          </span>
          <Notifications />
          <span className="hidden h-8 w-px bg-line sm:block" aria-hidden />
          <Link to={`/${profile.role}/profile`} className="flex items-center gap-2.5 rounded-lg p-1 hover:bg-bg">
            <Avatar name={profile.full_name} tone={profile.role === 'mentor' ? 'purple' : 'pink'} />
            <span className="hidden text-xs sm:block">
              <span className="block font-medium">{profile.full_name}</span>
              <span className="block text-muted">{roleLabel(profile.role)}</span>
            </span>
          </Link>
        </header>
        <main id="main" className="mx-auto w-full max-w-[1280px] flex-1 px-4 py-6 sm:px-8 sm:py-7">
          <Outlet context={{ refreshPending }} />
        </main>
      </div>
    </div>
  )
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end">
      <div className="min-w-0 flex-1">
        <h1 className="text-[28px] leading-9 font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-3 max-sm:[&>*]:flex-1">{actions}</div>}
    </div>
  )
}
