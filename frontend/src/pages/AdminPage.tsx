// import React, { useState, useEffect } from 'react'
// import AdminNavbar from '../components/common/AdminNavbar'

// export default function AdminPage(){
//     return(
//         <>
//             <div className="flex min-h-screen">
//                 <AdminNavbar />
//                 <h1 className="bg-green-700 w-full">This is the admin page</h1>
//             </div>
//         </>
//     )
// }

import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { AdminDashboard } from '../components/admin/AdminDashboard'

export default function AdminPage() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await signOut()
    navigate('/login')
  }

  function handleNavigate(route: string) {
    // Handle special case for dashboard which maps to root path
    if (route === 'dashboard') {
      navigate('/')
    } else {
      navigate(`/${route}`)
    }
  }

  return (
    <AdminDashboard 
      email={user?.email || ''} 
      onLogout={handleLogout} 
      onNavigate={handleNavigate}
    />
  )
}
