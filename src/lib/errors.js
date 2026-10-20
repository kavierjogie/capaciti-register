// Turn Supabase/Postgres errors into messages a user can act on, without leaking internals.
export function friendlyError(err) {
  if (!err) return 'Something went wrong. Please try again.'
  const msg = err.message || String(err)
  if (err.name === 'TypeError' || /Failed to fetch|NetworkError|network/i.test(msg))
    return 'Could not reach the server. Check your connection and try again.'
  if (/JWT expired|invalid JWT|refresh_token/i.test(msg)) return 'Your session has expired. Please sign in again.'
  if (/Invalid login credentials/i.test(msg)) return 'Incorrect email or password.'
  if (/Email not confirmed/i.test(msg)) return 'Please confirm your email address before signing in.'
  if (err.code === '42501' || /permission denied|not assigned to you|Only active/i.test(msg))
    return /^(Only active|Request not found)/.test(msg) ? msg : 'You are not allowed to do that.'
  if (err.code === 'P0001') return msg // our own business-rule messages, written for users
  if (err.code === '23514') return 'Some details are invalid. Please check the form.'
  if (import.meta.env?.DEV) console.error(err)
  return 'Something went wrong. Please try again.'
}
