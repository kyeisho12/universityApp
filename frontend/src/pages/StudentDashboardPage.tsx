import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { Dashboard } from '../components/student/Dashboard'
import { supabase } from '../lib/supabaseClient'

export default function StudentDashboardPage() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [fullName, setFullName] = React.useState<string>(user?.user_metadata?.full_name || '')
  const [studentId, setStudentId] = React.useState<string>('2024-00001')
  const [isNameLoading, setIsNameLoading] = React.useState<boolean>(false)

  React.useEffect(() => {
    let active = true
    async function loadProfile() {
      if (!user?.id) return
      setIsNameLoading(true)
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, student_id')
        .eq('id', user.id)
        .single()
      if (!active) return
      if (error) {
        console.error('Failed to load profile', error)
        setIsNameLoading(false)
        return
      }
      setFullName(data?.full_name || '')
      setStudentId(data?.student_id || '2024-00001')
      setIsNameLoading(false)
    }
    loadProfile()
    return () => {
      active = false
    }
  }, [user?.id])

  async function handleLogout() {
    try {
      await signOut()
    } catch (error) {
      console.error('Logout error:', error)
      // Still navigate to login even if logout fails
    } finally {
      navigate('/login')
    }
  }

  const emailPrefix = user?.email?.split('@')[0] || ''
  const displayName = isNameLoading ? '' : (fullName?.trim() || emailPrefix)

  function handleNavigate(route: string) {
    navigate(`/${route}`);
  }

  return (
    <Dashboard 
      email={user?.email || ''} 
      fullName={fullName}
      displayName={displayName}
      studentId={studentId}
      onLogout={handleLogout} 
      onNavigate={handleNavigate}
    />
  )
}