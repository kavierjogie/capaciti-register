import { ArrowLeft, Eye, EyeOff, LogIn, Mail } from 'lucide-react'
import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { homeFor, useAuth } from '../../auth/AuthProvider.jsx'
import { useToast } from '../../components/Toast.jsx'
import Button from '../../components/ui/Button.jsx'
import { Alert } from '../../components/ui/Feedback.jsx'
import { Field, Input } from '../../components/ui/Field.jsx'
import logoWhite from '../../assets/logo-full-white.png'
import logoColour from '../../assets/logo-full-colour.png'
import { friendlyError } from '../../lib/errors.js'
import { supabase } from '../../lib/supabase.js'
import { validateLogin, validateNewPassword, EMAIL_RE } from '../../lib/validation.js'

function AuthShell({ title, subtitle, children }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_minmax(480px,560px)]">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-kadet p-12 text-white lg:flex">
        <span className="absolute inset-y-0 left-0 w-2 bg-salmon" aria-hidden />
        <img src={logoWhite} alt="CAPACITI" width={200} height={40} />
        <div className="max-w-lg">
          <p className="mb-3 text-sm text-pink">Online Register &amp; WFH</p>
          <p className="text-4xl leading-tight font-semibold">Register your day and manage work-from-home requests in one place.</p>
        </div>
        <p className="text-xs text-kadet-50">CAPACITI · A division of UVU Africa</p>
      </aside>
      <main className="flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-[420px]">
          <img src={logoColour} alt="CAPACITI" width={200} height={40} className="mb-10 lg:hidden" />
          <h1 className="text-[28px] leading-9 font-semibold tracking-tight">{title}</h1>
          <p className="mt-1 mb-8 text-muted">{subtitle}</p>
          {children}
        </div>
      </main>
    </div>
  )
}

function PasswordInput({ label = 'Password', error, ...props }) {
  const [shown, setShown] = useState(false)
  return (
    <Field label={label} required error={error}>
      {(p) => (
        <div className="relative">
          <input {...p} {...props} type={shown ? 'text' : 'password'} className={`${p.className} h-11 pr-11`} />
          <button type="button" onClick={() => setShown((s) => !s)} className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1.5 text-muted hover:text-ink"
            aria-label={shown ? 'Hide password' : 'Show password'} aria-pressed={shown}>
            {shown ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
          </button>
        </div>
      )}
    </Field>
  )
}

export function Login() {
  const { session, profile, signedOutReason } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToast()
  const [form, setForm] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  if (session && profile) return <Navigate to={location.state?.from ?? homeFor(profile)} replace />

  async function submit(e) {
    e.preventDefault()
    const v = validateLogin(form)
    setErrors(v)
    if (Object.keys(v).length) return
    setBusy(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email: form.email.trim(), password: form.password })
    setBusy(false)
    if (error) return setError(friendlyError(error))
    toast('success', 'Signed in', 'Welcome back.')
    navigate('/', { replace: true })
  }

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  return (
    <AuthShell title="Sign in" subtitle="Use the account your CAPACITI team set up for you.">
      <form onSubmit={submit} noValidate className="flex flex-col gap-5">
        {(error || signedOutReason) && <Alert type="error" title={error ?? signedOutReason} />}
        <Input label="Email address" required type="email" autoComplete="email" value={form.email} onChange={set('email')}
          error={errors.email} placeholder="name@example.com" />
        <PasswordInput autoComplete="current-password" value={form.password} onChange={set('password')} error={errors.password} />
        <Link to="/forgot-password" className="-mt-2 self-end text-sm font-medium text-purple hover:underline">Forgot password?</Link>
        <Button type="submit" icon={LogIn} loading={busy}>Sign in</Button>
        <p className="text-center text-xs text-muted">No account? Your account will be created by CAPACITI.</p>
      </form>
    </AuthShell>
  )
}

export function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState(null)
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    if (!EMAIL_RE.test(email.trim())) return setError('Enter a valid email address')
    setBusy(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/reset-password` })
    setBusy(false)
    // Don't reveal whether the address exists; only surface transport/rate-limit failures.
    if (error && error.status !== 400) return setError(friendlyError(error))
    setSent(true)
  }

  return (
    <AuthShell title="Reset your password" subtitle="We'll email you a link to choose a new password.">
      {sent ? (
        <Alert type="success" title="Check your inbox">If an account exists for {email.trim()}, a reset link is on its way.</Alert>
      ) : (
        <form onSubmit={submit} noValidate className="flex flex-col gap-5">
          <Input label="Email address" required type="email" autoComplete="email" value={email}
            onChange={(e) => { setEmail(e.target.value); setError(null) }} error={error} />
          <Button type="submit" icon={Mail} loading={busy}>Send reset link</Button>
        </form>
      )}
      <Link to="/login" className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-purple hover:underline">
        <ArrowLeft className="size-4" /> Back to sign in
      </Link>
    </AuthShell>
  )
}

export function ResetPassword() {
  const { session, setRecovery } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const [form, setForm] = useState({ password: '', confirm: '' })
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)

  if (session === undefined) return null
  if (!session)
    return (
      <AuthShell title="Link expired" subtitle="This reset link is invalid or has already been used.">
        <Button to="/forgot-password">Request a new link</Button>
      </AuthShell>
    )

  async function submit(e) {
    e.preventDefault()
    const v = validateNewPassword(form)
    setErrors(v)
    if (Object.keys(v).length) return
    setBusy(true)
    const { error } = await supabase.auth.updateUser({ password: form.password })
    setBusy(false)
    if (error) return setErrors({ password: friendlyError(error) })
    setRecovery(false)
    toast('success', 'Password updated')
    navigate('/', { replace: true })
  }

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  return (
    <AuthShell title="Choose a new password" subtitle="Use at least 8 characters.">
      <form onSubmit={submit} noValidate className="flex flex-col gap-5">
        <PasswordInput label="New password" autoComplete="new-password" value={form.password} onChange={set('password')} error={errors.password} />
        <PasswordInput label="Confirm password" autoComplete="new-password" value={form.confirm} onChange={set('confirm')} error={errors.confirm} />
        <Button type="submit" loading={busy}>Update password</Button>
      </form>
    </AuthShell>
  )
}
