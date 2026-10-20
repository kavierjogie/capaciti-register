import { AlertCircle, CheckCircle2, Info, Inbox, Loader2, TriangleAlert, X } from 'lucide-react'
import Button from './Button.jsx'

// Figma "Alert"
const ALERT = {
  success: ['bg-success-surface border-success-border', CheckCircle2, 'text-success'],
  error: ['bg-error-surface border-error-border', AlertCircle, 'text-error'],
  warning: ['bg-warning-surface border-warning-border', TriangleAlert, 'text-warning'],
  info: ['bg-purple-tint border-purple-30', Info, 'text-purple'],
}
export function Alert({ type = 'info', title, children, onClose, action }) {
  const [cls, Icon, iconCls] = ALERT[type]
  return (
    <div role={type === 'error' ? 'alert' : 'status'} className={`flex items-start gap-3 rounded-[10px] border px-4 py-3.5 ${cls}`}>
      <Icon className={`size-5 shrink-0 ${iconCls}`} aria-hidden />
      <div className="min-w-0 flex-1">
        {title && <p className="font-medium leading-[22px]">{title}</p>}
        {children && <div className="text-xs leading-[18px]">{children}</div>}
      </div>
      {action}
      {onClose && (
        <button onClick={onClose} className="rounded p-0.5 text-muted hover:text-ink" aria-label="Dismiss">
          <X className="size-4" />
        </button>
      )}
    </div>
  )
}

export const Spinner = ({ label = 'Loading…' }) => (
  <div className="flex items-center justify-center gap-2 py-10 text-muted" role="status">
    <Loader2 className="size-5 animate-spin" aria-hidden /> {label}
  </div>
)

export const SkeletonRows = ({ rows = 4 }) => (
  <div className="space-y-3 px-5 pb-5" aria-hidden>
    {Array.from({ length: rows }, (_, i) => <div key={i} className="h-10 animate-pulse rounded-lg bg-surface-muted" />)}
  </div>
)

export function EmptyState({ icon: Icon = Inbox, title, children, action }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-surface-muted text-muted"><Icon className="size-6" aria-hidden /></span>
      <p className="font-medium">{title}</p>
      {children && <p className="max-w-sm text-xs text-muted">{children}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

export const ErrorState = ({ message, onRetry }) => (
  <div className="p-5">
    <Alert type="error" title="Couldn't load this" action={onRetry && <Button size="s" variant="secondary" onClick={onRetry}>Try again</Button>}>
      {message}
    </Alert>
  </div>
)
