import { supabase } from '../lib/supabaseClient'

export async function signUp(email, password, metadata = {}) {
  const { data, error } = await supabase.auth.signUp({ email, password, options: { data: metadata } })
  if (error) throw error
  return data
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  
  // Check if user account is disabled
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('is_active')
    .eq('id', data.user.id)
    .single()
  
  if (profileError) {
    await supabase.auth.signOut()
    throw new Error('Failed to verify account status')
  }
  
  if (!profile.is_active) {
    await supabase.auth.signOut()
    throw new Error('Your account has been disabled. Please contact an administrator.')
  }
  
  return data
}

export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut({ scope: 'local' })
    if (error) throw error
  } catch (error) {
    // If signOut fails due to missing session, clear local storage manually
    // This handles browser-specific storage issues
    console.warn('SignOut error, clearing auth data:', error)
    
    // Clear all auth-related data from localStorage
    const keys = Object.keys(localStorage)
    keys.forEach(key => {
      if (key.includes('supabase') || key.includes('auth')) {
        localStorage.removeItem(key)
      }
    })
    
    // If it was still an actual error (not just missing session), throw it
    if (error?.message && !error.message.includes('Auth session missing')) {
      throw error
    }
  }
}

export async function getSession() {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  return data.session
}
