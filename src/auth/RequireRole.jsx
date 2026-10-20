import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { ErrorState, Spinner } from '../components/ui/Feedback.jsx'
import { friendlyError } from '../lib/errors.js'
import { useAuth } from './AuthProvider.jsx'

// UX guard only — the database (RLS + RPC checks) is what actually enforces access.
export default function RequireRole({ role }) {
  const { session, profile, profileError, loading, reloadProfile } = useAuth()
  const location = useLocation()

  if (loading) return <div className="grid min-h-dvh place-items-center"><Spinner label="Checking your session…" /></div>
  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (profileError) return <ErrorState message={friendlyError(profileError)} onRetry={reloadProfile} />
  if (role && profile.role !== role) return <Navigate to="/unauthorized" replace />
  return <Outlet />
}
