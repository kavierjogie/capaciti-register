import { Loader2 } from 'lucide-react'
import { Link } from 'react-router-dom'

// Figma "Button": Type (primary/secondary/danger/ghost) × Size (M=44px, S=36px) × State.
const TYPES = {
  primary: 'bg-purple text-white hover:bg-purple-hover',
  secondary: 'bg-white text-ink border border-line-strong hover:bg-bg',
  danger: 'bg-error text-white hover:bg-[#931c13]',
  ghost: 'text-purple hover:bg-purple-tint',
}
const SIZES = { m: 'h-11 px-5 gap-2 text-sm', s: 'h-9 px-3.5 gap-1.5 text-[13px]' }

export function buttonClass({ variant = 'primary', size = 'm', className = '' } = {}) {
  return `inline-flex shrink-0 items-center justify-center rounded-lg font-semibold whitespace-nowrap transition-colors
    disabled:cursor-not-allowed disabled:opacity-50 ${TYPES[variant]} ${SIZES[size]} ${className}`
}

export default function Button({ variant, size, icon: Icon, loading, children, className, to, ...props }) {
  const content = (
    <>
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : Icon && <Icon className="size-[18px]" aria-hidden />}
      {children}
    </>
  )
  const cls = buttonClass({ variant, size, className })
  if (to) return <Link to={to} className={cls}>{content}</Link>
  return (
    <button type="button" className={cls} disabled={loading || props.disabled} aria-busy={loading || undefined} {...props}>
      {content}
    </button>
  )
}
