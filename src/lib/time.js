// All display in Africa/Johannesburg; the database is the clock of record.
export const TZ = 'Africa/Johannesburg'

// Display-only threshold for the "Late" badge. Not enforced anywhere — confirm with CAPACITI.
export const LATE_AFTER = '08:30'

const fmt = (opts) => new Intl.DateTimeFormat('en-ZA', { timeZone: TZ, ...opts })
const dateOnly = (d) => (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d) ? new Date(`${d}T12:00:00+02:00`) : new Date(d))

export const formatTime = (ts) => (ts ? fmt({ hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(ts)) : '—')
export const formatDate = (d) => (d ? fmt({ day: '2-digit', month: 'short', year: 'numeric' }).format(dateOnly(d)) : '—')
export const formatDay = (d) => fmt({ weekday: 'short', day: '2-digit', month: 'short' }).format(dateOnly(d))
export const formatDayLong = (d) => fmt({ weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }).format(dateOnly(d))
export const formatFullDate = (d) => fmt({ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(dateOnly(d))
export const formatDateTime = (ts) => (ts ? `${formatDate(ts)} ${formatTime(ts)}` : '—')

/** YYYY-MM-DD for "today" in SAST, regardless of the browser's timezone. */
export function sastToday(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(now)
}

export function addDays(isoDate, n) {
  const d = new Date(`${isoDate}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

/** Monday of the week containing isoDate. */
export function weekStart(isoDate) {
  const dow = new Date(`${isoDate}T12:00:00Z`).getUTCDay() || 7
  return addDays(isoDate, 1 - dow)
}

/** First and last day of the month containing isoDate. */
export function monthBounds(isoDate) {
  const [y, m] = isoDate.split('-').map(Number)
  return { from: `${isoDate.slice(0, 7)}-01`, to: new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10) }
}

export const formatMonth = (isoDate) => fmt({ month: 'long', year: 'numeric' }).format(dateOnly(isoDate))

export const isWeekend =(isoDate) => [0, 6].includes(new Date(`${isoDate}T12:00:00Z`).getUTCDay())

export function hoursBetween(from, to) {
  if (!from || !to) return null
  return Math.round(((new Date(to) - new Date(from)) / 36e5) * 10) / 10
}

export const formatHours = (h) => (h == null ? '—' : `${Number(h).toFixed(1)} h`)

export const isLate = (checkInAt) => Boolean(checkInAt) && formatTime(checkInAt) > LATE_AFTER

export function greeting(now = new Date()) {
  const h = Number(fmt({ hour: '2-digit', hour12: false }).format(now))
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}
