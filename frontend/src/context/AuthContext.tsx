import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'
import { signIn, signOut, signUp, getSession } from '../services/authService'

type AuthContextValue = {
  user: User | null
  isLoading: boolean
  signIn: typeof signIn
  signOut: typeof signOut
  signUp: typeof signUp
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    getSession()
      .then((session) => {
        if (mounted) setUser(session?.user ?? null)
      })
      .finally(() => {
        if (mounted) setIsLoading(false)
      })

    const { data: listener } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null)
    })

    return () => {
      mounted = false
      listener?.subscription?.unsubscribe()
    }
  }, [])

  const value = useMemo(
    () => ({ user, isLoading, signIn, signOut, signUp }),
    [user, isLoading]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuthContext() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuthContext must be used within an AuthProvider')
  }
  return ctx
}
