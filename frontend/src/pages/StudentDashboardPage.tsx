import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

function NavBar() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  const isAdmin = Boolean(user?.email?.endsWith('@admin.tsu.edu.ph'))

  return (
    <nav className="flex flex-wrap items-center gap-2 sm:gap-4 border-b border-neutral-800 bg-black px-3 sm:px-4 md:px-6 py-3 text-white">
      <Link className="text-xs sm:text-sm font-medium text-white transition hover:text-indigo-200" to="/">
        Home
      </Link>
      {user && (
        <Link className="text-xs sm:text-sm font-medium text-white transition hover:text-indigo-200" to="/">
          Dashboard
        </Link>
      )}
      <Link className="text-xs sm:text-sm font-medium text-white transition hover:text-indigo-200" to="/login">
        Login
      </Link>
      <Link className="text-xs sm:text-sm font-medium text-white transition hover:text-indigo-200" to="/register">
        Register
      </Link>
      {user && isAdmin && (
        <Link className="text-xs sm:text-sm font-medium text-white transition hover:text-indigo-200" to="/admin">
          Admin
        </Link>
      )}
      {user ? (
        <button
          onClick={handleSignOut}
          className="ml-auto rounded-md border border-white/30 px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-semibold text-white transition hover:bg-white/10 active:scale-95"
        >
          Sign out
        </button>
      ) : null}
    </nav>
  )
}

export default function StudentDashboardPage() {
  const { user } = useAuth()

  return (
    <div className="min-h-screen bg-neutral-50">
      <NavBar />
      <div className="mx-auto max-w-6xl space-y-4 sm:space-y-6 px-3 sm:px-4 md:px-6 py-4 sm:py-6">
        <div className="rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm ring-1 ring-neutral-200/60">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="text-xs sm:text-sm font-semibold uppercase tracking-wide text-indigo-600">Student Dashboard</p>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-neutral-900 break-words">Welcome {user ? user.email : 'Guest'}</h1>
              <p className="text-xs sm:text-sm text-neutral-600">Status: {user ? 'Signed in' : 'Not signed in'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
