import { Bell } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { listNotifications, markAllRead } from '../../api/notifications.js'
import { formatDateTime } from '../../lib/time.js'

export default function Notifications() {
  const [items, setItems] = useState([])
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const { pathname } = useLocation()
  const unread = items.filter((n) => !n.read_at).length

  // Refresh on navigation; Realtime isn't worth the complexity for a handful of notifications.
  useEffect(() => { listNotifications().then(setItems).catch(() => {}) }, [pathname])
  useEffect(() => {
    if (!open) return
    const close = (e) => (e.key === 'Escape' || (e.type === 'mousedown' && !ref.current?.contains(e.target))) && setOpen(false)
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', close)
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', close) }
  }, [open])

  function toggle() {
    setOpen((o) => !o)
    if (!open && unread) markAllRead().then(() => setItems((xs) => xs.map((n) => ({ ...n, read_at: n.read_at ?? 'now' })))).catch(() => {})
  }

  return (
    <div ref={ref} className="relative">
      <button onClick={toggle} aria-expanded={open} aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
        className="relative grid size-10 place-items-center rounded-lg text-kadet hover:bg-bg">
        <Bell className="size-5" aria-hidden />
        {unread > 0 && <span className="absolute top-2 right-2 size-2 rounded-full bg-salmon ring-2 ring-white" aria-hidden />}
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-2 w-[min(360px,calc(100vw-2rem))] rounded-xl border border-line bg-white p-2 shadow-pop">
          <p className="label-caps px-3 py-2">Notifications</p>
          {items.length === 0 ? (
            <p className="px-3 py-6 text-center text-xs text-muted">You're all caught up.</p>
          ) : (
            <ul className="max-h-96 overflow-y-auto">
              {items.map((n) => (
                <li key={n.id}>
                  <Link to={n.link ?? '#'} onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2.5 hover:bg-bg">
                    <p className="font-medium">{n.title}</p>
                    {n.body && <p className="text-xs text-muted">{n.body}</p>}
                    <p className="mt-0.5 text-[11px] text-placeholder">{formatDateTime(n.created_at)}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
