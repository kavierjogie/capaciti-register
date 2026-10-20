import { createContext, useCallback, useContext, useState } from 'react'
import { Alert } from './ui/Feedback.jsx'

const ToastContext = createContext(() => {})
export const useToast = () => useContext(ToastContext)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const dismiss = (id) => setToasts((t) => t.filter((x) => x.id !== id))
  const toast = useCallback((type, title, message) => {
    const id = crypto.randomUUID()
    setToasts((t) => [...t.slice(-2), { id, type, title, message }])
    setTimeout(() => dismiss(id), type === 'error' ? 8000 : 4500)
  }, [])

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col items-end gap-2 sm:left-auto sm:w-96" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto w-full rounded-[10px] bg-white shadow-pop">
            <Alert type={t.type} title={t.title} onClose={() => dismiss(t.id)}>{t.message}</Alert>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
