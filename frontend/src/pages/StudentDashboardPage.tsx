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
      <div className="-mx-4 md:-mx-6 -my-6">
        <Dashboard 
          email={user?.email || ''} 
          onLogout={handleLogout} 
          onNavigate={handleNavigate}
        />
      </div>
    </>
  )
}
