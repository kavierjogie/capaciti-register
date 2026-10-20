import { AlertCircle, ChevronDown } from 'lucide-react'
import { useId } from 'react'

// Figma "Input" / "Textarea" / "Select": label, required *, 44px field, purple focus, red error + message.
const base = `w-full rounded-lg border bg-white px-3 text-sm text-ink placeholder:text-placeholder transition-colors
  focus:outline-none focus:border-[1.5px] focus:border-purple focus:ring-3 focus:ring-purple/15
  disabled:bg-surface-muted disabled:text-muted`

export function Field({ label, required, hint, error, children, className = '' }) {
  const id = useId()
  const describedBy = error ? `${id}-err` : hint ? `${id}-hint` : undefined
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label htmlFor={id} className="text-sm font-medium">
          {label} {required && <span className="text-error" aria-hidden>*</span>}
        </label>
      )}
      {children({ id, 'aria-invalid': Boolean(error) || undefined, 'aria-describedby': describedBy, required,
        className: `${base} ${error ? 'border-[1.5px] border-error' : 'border-line-strong'}` })}
      {error ? (
        <p id={`${id}-err`} className="flex gap-1.5 text-xs text-error" role="alert">
          <AlertCircle className="mt-px size-4 shrink-0" aria-hidden />{error}
        </p>
      ) : hint && <p id={`${id}-hint`} className="text-xs text-muted">{hint}</p>}
    </div>
  )
}

export const Input = ({ label, required, hint, error, className, ...props }) => (
  <Field {...{ label, required, hint, error, className }}>{(p) => <input {...p} {...props} className={`${p.className} h-11`} />}</Field>
)

export const Textarea = ({ label, required, hint, error, className, ...props }) => (
  <Field {...{ label, required, hint, error, className }}>
    {(p) => <textarea rows={4} {...p} {...props} className={`${p.className} resize-y py-2.5`} />}
  </Field>
)

export const Select = ({ label, required, hint, error, className, children, ...props }) => (
  <Field {...{ label, required, hint, error, className }}>
    {(p) => (
      <div className="relative">
        <select {...p} {...props} className={`${p.className} h-11 cursor-pointer appearance-none pr-9`}>{children}</select>
        <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-5 -translate-y-1/2 text-muted" aria-hidden />
      </div>
    )}
  </Field>
)
