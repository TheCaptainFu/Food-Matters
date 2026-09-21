import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from './supabaseClient'

export type AuthState = {
  user: User | null
  // Distinguishes "still checking if you're logged in" from "checked, and
  // you're not" — without this the login screen would flash on every load.
  isLoading: boolean
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(!!supabase)

  useEffect(() => {
    if (!supabase) return

    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
      setIsLoading(false)
    })

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.subscription.unsubscribe()
  }, [])

  return { user, isLoading }
}

export async function signInWithProvider(provider: 'google' | 'azure' | 'apple') {
  if (!supabase) return
  await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: window.location.origin } })
}

export async function signOut() {
  if (!supabase) return
  await supabase.auth.signOut()
}
