import { Save } from 'lucide-react'
import { useState } from 'react'
import { getMentor, updateMyProfile } from '../api/profiles.js'
import { useAuth } from '../auth/AuthProvider.jsx'
import { PageHeader } from '../components/layout/AppLayout.jsx'
import { useToast } from '../components/Toast.jsx'
import Avatar from '../components/ui/Avatar.jsx'
import Badge from '../components/ui/Badge.jsx'
import Button from '../components/ui/Button.jsx'
import { Card } from '../components/ui/Card.jsx'
import { Alert } from '../components/ui/Feedback.jsx'
import { Input } from '../components/ui/Field.jsx'
import { useAsync } from '../hooks/useAsync.js'
import { friendlyError } from '../lib/errors.js'
import { formatDate } from '../lib/time.js'
import { validateProfile } from '../lib/validation.js'

const Item = ({ label, children }) => (
  <div className="border-t border-line py-3 first:border-0"><dt className="text-xs text-muted">{label}</dt><dd className="font-medium">{children || '—'}</dd></div>
)

export default function Profile() {
  const { profile, setProfile } = useAuth()
  const toast = useToast()
  const isCandidate = profile.role === 'candidate'
  const { data: mentor } = useAsync(() => (isCandidate ? Promise.resolve(getMentor(profile.mentor_id)) : Promise.resolve(null)), [profile.mentor_id])
  const [form, setForm] = useState({ full_name: profile.full_name, phone: profile.phone ?? '' })
  const [errors, setErrors] = useState({})
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const dirty = form.full_name !== profile.full_name || form.phone !== (profile.phone ?? '')

  async function save(e) {
    e.preventDefault()
    const v = validateProfile(form)
    setErrors(v)
    if (Object.keys(v).length) return
    setBusy(true)
    setError(null)
    try {
      setProfile(await updateMyProfile(profile.id, form))
      toast('success', 'Profile updated')
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <PageHeader title="Profile" subtitle="Your account details." />
      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <Card className="flex flex-col items-center gap-3 p-6 text-center">
          <Avatar name={profile.full_name} size="l" tone={isCandidate ? 'pink' : 'purple'} />
          <div>
            <p className="text-lg font-semibold">{profile.full_name}</p>
            <p className="text-muted">{isCandidate ? 'Candidate' : 'Tech Champion'}</p>
          </div>
          <Badge tone={profile.status === 'active' ? 'approved' : 'neutral'}>{profile.status === 'active' ? 'Active' : 'Inactive'}</Badge>
          <dl className="mt-2 w-full text-left">
            <Item label="Email">{profile.email}</Item>
            {isCandidate && <Item label="Candidate ID">{profile.candidate_identifier}</Item>}
            <Item label="Programme / cohort">{profile.cohort}</Item>
            {isCandidate && <Item label="Tech Champion">{mentor?.full_name ?? 'Not assigned yet'}</Item>}
            <Item label="Member since">{formatDate(profile.created_at)}</Item>
          </dl>
        </Card>
        <Card className="p-6">
          <form onSubmit={save} noValidate className="flex max-w-lg flex-col gap-5">
            <h2 className="text-lg font-semibold">Edit details</h2>
            {error && <Alert type="error" title={error} />}
            <Input label="Full name" required value={form.full_name} maxLength={120} error={errors.full_name}
              onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} />
            <Input label="Phone number" type="tel" value={form.phone} error={errors.phone} placeholder="+27 …"
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
            <Input label="Email address" value={profile.email} disabled hint="Contact your Tech Champion to change your email." />
            <p className="text-xs text-muted">Role, candidate ID, cohort and Tech Champion assignment are managed by CAPACITI.</p>
            <Button type="submit" icon={Save} loading={busy} disabled={!dirty} className="self-start">Save changes</Button>
          </form>
        </Card>
      </div>
    </>
  )
}
