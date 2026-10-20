import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { getProfile } from '../api/profiles.js'
import { supabase } from '../lib/supabase.js'

const AuthContext = createContext(null)
export const useAuth = () => useContext(AuthContext)

export const homeFor = (profile) => (profile?.role === 'mentor' ? '/mentor' : '/candidate')

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined) // undefined = still checking
  const [profile, setProfile] = useState(null)
  const [profileError, setProfileError] = useState(null)
  const [recovery, setRecovery] = useState(false)
  const [signedOutReason, setSignedOutReason] = useState(null)
  const manualSignOut = useRef(false)

  const loadProfile = useCallback(async (s) => {
    if (!s) return setProfile(null)
    try {
      const p = await getProfile(s.user.id)
      if (p.status !== 'active') {
        setSignedOutReason('Your account is inactive. Contact your Tech Champion.')
        manualSignOut.current = true
        await supabase.auth.signOut()
        return
      }
      setProfile(p)
      setProfileError(null)
    } catch (e) {
      setProfileError(e)
    }
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      loadProfile(data.session)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === 'PASSWORD_RECOVERY') setRecovery(true)
      if (event === 'SIGNED_OUT' && !manualSignOut.current) setSignedOutReason('Your session has expired. Please sign in again.')
      if (event === 'SIGNED_IN') { manualSignOut.current = false; setSignedOutReason(null) }
      setSession(s)
      // Defer: supabase-js warns against awaiting other calls inside this callback.
      if (event !== 'TOKEN_REFRESHED') setTimeout(() => loadProfile(s), 0)
    })
    return () => sub.subscription.unsubscribe()
  }, [loadProfile])

  const signOut = async () => {
    manualSignOut.current = true
    setSignedOutReason(null)
    await supabase.auth.signOut()
  }

  const value = {
    session, profile, setProfile, profileError, recovery, setRecovery, signedOutReason,
    loading: session === undefined || (session && !profile && !profileError),
    signOut, reloadProfile: () => loadProfile(session),
  }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
