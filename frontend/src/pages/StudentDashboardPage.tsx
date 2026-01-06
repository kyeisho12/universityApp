import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { Dashboard } from '../components/student/Dashboard'

export default function StudentDashboardPage() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await signOut()
    navigate('/login')
  }

  function handleNavigate(route: string) {
    navigate(`/${route}`)
  }

  return (
    <>
      <Dashboard 
        email={user?.email || ''} 
        onLogout={handleLogout} 
        onNavigate={handleNavigate}
      />
    </>
  )
}
