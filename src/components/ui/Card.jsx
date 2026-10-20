import { Link } from 'react-router-dom'

export function Card({ className = '', children, as: Tag = 'section', ...props }) {
  return (
    <Tag className={`rounded-xl border border-line bg-white shadow-card ${className}`} {...props}>
      {children}
    </Tag>
  )
}

export function CardHeader({ title, subtitle, action, actionTo, id }) {
  return (
    <div className="flex items-center gap-3 px-5 pt-5 pb-3">
      <div className="min-w-0 flex-1">
        <h2 id={id} className="text-base font-semibold leading-6">{title}</h2>
        {subtitle && <p className="text-xs text-muted">{subtitle}</p>}
      </div>
      {actionTo ? <Link to={actionTo} className="text-sm font-medium text-purple hover:underline">{action ?? 'View all'}</Link> : action}
    </div>
  )
}

// Figma "Card/Stat"
const CHIP = {
  purple: 'bg-purple-tint text-purple',
  success: 'bg-success-surface text-success',
  warning: 'bg-warning-surface text-warning',
  kadet: 'bg-kadet-tint text-kadet',
  error: 'bg-error-surface text-error',
}
export function StatCard({ label, value, caption, icon: Icon, tone = 'purple', loading }) {
  return (
    <Card as="div" className="flex flex-col gap-2.5 p-5">
      <div className="flex items-center gap-3">
        <p className="flex-1 text-sm font-medium text-muted">{label}</p>
        <span className={`grid size-9 place-items-center rounded-[10px] ${CHIP[tone]}`}><Icon className="size-5" aria-hidden /></span>
      </div>
      {loading ? <span className="h-9 w-20 animate-pulse rounded bg-surface-muted" /> :
        <p className="text-[28px] font-semibold leading-9 tracking-tight">{value}</p>}
      <p className="text-xs text-muted">{caption}</p>
    </Card>
  )
}
