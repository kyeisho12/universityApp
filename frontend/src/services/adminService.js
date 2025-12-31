import { supabase } from '../lib/supabaseClient'

/**
 * Admin Service
 * Functions for admin operations including user management
 */

// =============================================================================
// USER MANAGEMENT
// =============================================================================

/**
 * Get all users (admins only)
 * @returns {Promise<Array>} List of all user profiles
 */
export async function getAllUsers() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data
}

/**
 * Get users by role
 * @param {string} role - The role to filter by ('student', 'admin', 'recruiter')
 * @returns {Promise<Array>} List of users with specified role
 */
export async function getUsersByRole(role) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', role)
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data
}

/**
 * Get a specific user by ID
 * @param {string} userId - The user's UUID
 * @returns {Promise<Object>} User profile
 */
export async function getUserById(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  
  if (error) throw error
  return data
}

/**
 * Update user profile (admin can update any user)
 * @param {string} userId - The user's UUID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated user profile
 */
export async function updateUserProfile(userId, updates) {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single()
  
  if (error) throw error
  return data
}

/**
 * Update user role (admin only)
 * @param {string} userId - The user's UUID
 * @param {string} newRole - The new role ('student', 'admin', 'recruiter')
 * @returns {Promise<Object>} Updated user profile
 */
export async function updateUserRole(userId, newRole) {
  return updateUserProfile(userId, { role: newRole })
}

/**
 * Enable/disable a user (admin only)
 * @param {string} userId - The user's UUID
 * @param {boolean} isActive - Whether the account should be active
 * @returns {Promise<Object>} Updated user profile
 */
export async function setUserActiveStatus(userId, isActive) {
  const { data, error } = await supabase
    .from('profiles')
    .update({ is_active: isActive })
    .eq('id', userId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Search users by name or email
 * @param {string} searchTerm - Search query
 * @returns {Promise<Array>} Matching users
 */
export async function searchUsers(searchTerm) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data
}

/**
 * Get user statistics
 * @returns {Promise<Object>} User statistics
 */
export async function getUserStats() {
  // Get total users
  const { count: totalUsers, error: totalError } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
  
  if (totalError) throw totalError

  // Get students count
  const { count: studentsCount, error: studentsError } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'student')
  
  if (studentsError) throw studentsError

  // Get admins count
  const { count: adminsCount, error: adminsError } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'admin')
  
  if (adminsError) throw adminsError

  // Get recruiters count
  const { count: recruitersCount, error: recruitersError } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'recruiter')
  
  if (recruitersError) throw recruitersError

  return {
    totalUsers,
    students: studentsCount,
    admins: adminsCount,
    recruiters: recruitersCount
  }
}

// =============================================================================
// CURRENT USER / ADMIN CHECK
// =============================================================================

/**
 * Check if current user is an admin
 * @returns {Promise<boolean>} True if user is admin
 */
export async function isCurrentUserAdmin() {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return false
    
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    
    if (error) return false
    
    return data?.role === 'admin'
  } catch (error) {
    console.error('Error checking admin status:', error)
    return false
  }
}

/**
 * Get current user's profile
 * @returns {Promise<Object|null>} Current user's profile or null
 */
export async function getCurrentUserProfile() {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return null
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    
    if (error) throw error
    
    return data
  } catch (error) {
    console.error('Error getting current user profile:', error)
    return null
  }
}
