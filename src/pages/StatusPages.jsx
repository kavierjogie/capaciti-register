import { ShieldAlert, SearchX } from 'lucide-react'
import { homeFor, useAuth } from '../auth/AuthProvider.jsx'
import Button from '../components/ui/Button.jsx'

function StatusPage({ icon: Icon, title, children }) {
  const { profile } = useAuth()
  return (
    <main className="grid min-h-dvh place-items-center p-6 text-center">
      <div className="flex max-w-md flex-col items-center gap-3">
        <span className="grid size-14 place-items-center rounded-full bg-purple-tint text-purple"><Icon className="size-7" aria-hidden /></span>
        <h1 className="text-[22px] font-semibold">{title}</h1>
        <p className="text-muted">{children}</p>
        <Button to={profile ? homeFor(profile) : '/login'} className="mt-2">{profile ? 'Go to my dashboard' : 'Sign in'}</Button>
      </div>
    </main>
  )
}

export const Unauthorized = () => (
  <StatusPage icon={ShieldAlert} title="You don't have access to this page">This area is for a different role. If you think this is a mistake, contact your Tech Champion.</StatusPage>
)
export const NotFound = () => <StatusPage icon={SearchX} title="Page not found">The page you're looking for doesn't exist.</StatusPage>
