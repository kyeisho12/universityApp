import { supabase } from '../lib/supabaseClient'

export type UserRole = 'student' | 'admin' | 'recruiter'

export interface UserProfile {
  id: string
  full_name?: string | null
  email?: string | null
  role?: UserRole
  university?: string | null
  major?: string | null
  graduation_year?: string | number | null
  avatar_url?: string | null
  phone?: string | null
  is_active?: boolean
  created_at?: string | null
  updated_at?: string | null
  bio?: string | null
}

export interface UserStats {
  totalUsers: number
  students: number
  admins: number
  recruiters: number
}

// =============================================================================
// USER MANAGEMENT
// =============================================================================

export async function getAllUsers(): Promise<UserProfile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

export async function getUsersByRole(role: UserRole): Promise<UserProfile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', role)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

export async function getUserById(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) throw error
  return data ?? null
}

export async function updateUserProfile(
  userId: string,
  updates: Partial<UserProfile>
): Promise<UserProfile> {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single()

  if (error) throw error
  if (!data) throw new Error('No data returned when updating user profile')
  return data
}

export async function updateUserRole(userId: string, newRole: UserRole): Promise<UserProfile> {
  return updateUserProfile(userId, { role: newRole })
}

export async function setUserActiveStatus(userId: string, isActive: boolean): Promise<UserProfile> {
  const { data, error } = await supabase
    .from('profiles')
    .update({ is_active: isActive })
    .eq('id', userId)
    .select()
    .single()

  if (error) throw error
  if (!data) throw new Error('No data returned when updating user active status')
  return data
}

export async function searchUsers(searchTerm: string): Promise<UserProfile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

export async function getUserStats(): Promise<UserStats> {
  const { count: totalUsers, error: totalError } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })

  if (totalError) throw totalError

  const { count: studentsCount, error: studentsError } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'student')

  if (studentsError) throw studentsError

  const { count: adminsCount, error: adminsError } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'admin')

  if (adminsError) throw adminsError

  const { count: recruitersCount, error: recruitersError } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'recruiter')

  if (recruitersError) throw recruitersError

  return {
    totalUsers: totalUsers ?? 0,
    students: studentsCount ?? 0,
    admins: adminsCount ?? 0,
    recruiters: recruitersCount ?? 0,
  }
}

// =============================================================================
// CURRENT USER / ADMIN CHECK
// =============================================================================

export async function isCurrentUserAdmin(): Promise<boolean> {
  try {
    const { data: authData } = await supabase.auth.getUser()

    if (!authData?.user) return false

    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', authData.user.id)
      .single()

    if (error) return false

    return data?.role === 'admin'
  } catch (error) {
    console.error('Error checking admin status:', error)
    return false
  }
}

export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  try {
    const { data: authData } = await supabase.auth.getUser()

    if (!authData?.user) return null

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single()

    if (error) throw error

    return data ?? null
  } catch (error) {
    console.error('Error getting current user profile:', error)
    return null
  }
}
