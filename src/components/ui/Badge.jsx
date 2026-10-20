// Figma "Badge/Status" and "Badge/Attendance": dot + label, so status never relies on colour alone.
const TONES = {
  pending: ['bg-warning-surface text-warning', 'bg-warning-accent'],
  approved: ['bg-success-surface text-success', 'bg-success'],
  rejected: ['bg-error-surface text-error', 'bg-error'],
  submitted: ['bg-purple-tint text-purple', 'bg-purple'],
  late: ['bg-pink-50 text-late', 'bg-salmon'],
  missing: ['bg-surface-muted text-muted', 'bg-kadet-50'],
  wfh: ['bg-kadet-tint text-kadet', 'bg-kadet'],
  office: ['bg-pink-50 text-kadet', 'bg-salmon'],
  working: ['bg-success-surface text-success', 'bg-success'],
  neutral: ['bg-surface-muted text-muted', 'bg-kadet-50'],
}

export default function Badge({ tone = 'neutral', children }) {
  const [cls, dot] = TONES[tone] ?? TONES.neutral
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-[3px] text-xs font-medium leading-[18px] whitespace-nowrap ${cls}`}>
      <span className={`size-1.5 rounded-full ${dot}`} aria-hidden />
      {children}
    </span>
  )
}

const LABEL = { pending: 'Pending', approved: 'Approved', rejected: 'Rejected' }
export const StatusBadge = ({ status }) => <Badge tone={status}>{LABEL[status] ?? status}</Badge>
export const ModeBadge = ({ mode }) =>
  mode === 'wfh' ? <Badge tone="wfh">Working From Home</Badge> : <Badge tone="office">Office</Badge>
