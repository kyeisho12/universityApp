import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useStudent } from '../context/StudentContext'
import { useStudentId } from '../hooks/useStudentId'
import { Dashboard } from '../components/student/Dashboard'

export default function StudentDashboardPage() {
  const { user, signOut } = useAuth()
  const { profile, isProfileComplete, isProfileLoading } = useStudent()
  const navigate = useNavigate()
  const studentId = useStudentId(user?.id)
  const fullName = profile?.full_name ? String(profile.full_name) : ''

  useEffect(() => {
    // Wait until profile is loaded to check completeness
    if (!isProfileLoading && user && !isProfileComplete) {
      navigate('/create-profile', { replace: true })
    }
  }, [isProfileComplete, isProfileLoading, user, navigate])

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
  const displayName = fullName?.trim() || emailPrefix

  function handleNavigate(route: string) {
    navigate(`/${route}`);
  }

  // Show loading state while checking profile
  if (isProfileLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-neutral-600">Loading...</p>
      </div>
    )
  }

  // Render dashboard only if profile is complete
  if (!isProfileComplete) {
    return null
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