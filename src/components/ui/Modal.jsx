import { X } from 'lucide-react'
import { useEffect, useRef } from 'react'

// Native <dialog>: focus trap, Esc to close and inert background for free. Figma "Modal/Confirmation".
export default function Modal({ open, onClose, title, description, icon, children, footer, size = 'md' }) {
  const ref = useRef(null)
  useEffect(() => {
    const d = ref.current
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-labelledby="modal-title"
      className={`m-auto w-[calc(100%-2rem)] ${size === 'lg' ? 'max-w-xl' : 'max-w-[480px]'} rounded-2xl bg-white p-0 text-ink
        shadow-modal backdrop:bg-kadet/55`}
    >
      {open && (
        <div className="flex max-h-[90dvh] flex-col">
          <div className="relative flex flex-col items-center gap-1.5 px-6 pt-8 text-center sm:px-8">
            {icon}
            <h2 id="modal-title" className="text-[22px] font-semibold leading-[30px] tracking-tight">{title}</h2>
            {description && <p className="text-muted">{description}</p>}
            <button onClick={onClose} className="absolute top-4 right-4 rounded p-1 text-muted hover:text-ink" aria-label="Close">
              <X className="size-5" />
            </button>
          </div>
          <div className="overflow-y-auto px-6 py-5 sm:px-8">{children}</div>
          {footer && <div className="flex gap-3 px-6 pb-8 sm:px-8 [&>*]:flex-1">{footer}</div>}
        </div>
      )}
    </dialog>
  )
}

export const ModalIcon = ({ icon: Icon, tone = 'success' }) => {
  const cls = { success: 'bg-success-surface text-success', error: 'bg-error-surface text-error', purple: 'bg-purple-tint text-purple' }[tone]
  return <span className={`mb-3 grid size-14 place-items-center rounded-full ${cls}`}><Icon className="size-7" aria-hidden /></span>
}
