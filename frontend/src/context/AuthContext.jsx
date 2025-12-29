import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { signIn, signOut, signUp, getSession } from '../services/authService'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
	const [user, setUser] = useState(null)
	const [isLoading, setIsLoading] = useState(true)

	useEffect(() => {
		let mounted = true

		// Get initial session
		getSession()
			.then((session) => {
				if (mounted) setUser(session?.user ?? null)
			})
			.finally(() => {
				if (mounted) setIsLoading(false)
			})

		// Listen for auth state changes
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
