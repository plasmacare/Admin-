import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase'

const AuthContext = createContext(null)

// Every tab the app currently has. 'admin' role always sees all of these
// regardless of what's stored in allowed_tabs.
export const ALL_TABS = ['bookings', 'catalog', 'ai-packages', 'pages', 'announcements', 'payments', 'views']

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined) // undefined = still checking
  const [profile, setProfile] = useState(undefined) // undefined = still checking, null = none found

  async function loadProfile(userId) {
    const { data, error } = await supabase
      .from('staff_profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('Failed to load staff profile:', error.message)
      setProfile(null)
      return
    }

    if (!data.is_active) {
      // Deactivated staff get signed out immediately, even mid-session.
      await supabase.auth.signOut()
      setProfile(null)
      setSession(null)
      return
    }

    setProfile(data)
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session)
      if (data.session?.user) await loadProfile(data.session.user.id)
      else setProfile(null)
    })
    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, s) => {
      setSession(s)
      if (s?.user) await loadProfile(s.user.id)
      else setProfile(null)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  async function login(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  async function logout() {
    await supabase.auth.signOut()
  }

  // Which tabs this logged-in user is allowed to see. Admin = everything.
  const visibleTabs = profile?.role === 'admin' ? ALL_TABS : (profile?.allowed_tabs || [])

  return (
    <AuthContext.Provider
      value={{
        session,
        profile,
        role: profile?.role ?? null,
        visibleTabs,
        loading: session === undefined || (session && profile === undefined),
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
