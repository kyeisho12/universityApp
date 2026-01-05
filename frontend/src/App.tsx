import React, { type ReactNode } from 'react'
import { Routes, Route, Link, useNavigate, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { useStudent } from './context/StudentContext'
import Login from './components/auth/Login'
import Register from './components/auth/Register'
import AdminDashboardPage from './pages/AdminDashboardPage'
import StudentDashboardPage from './pages/StudentDashboardPage'
import CreateStudentProfilePage from './pages/CreateStudentProfilePage'

function NavBar() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  const isAdmin = Boolean(user?.email?.endsWith('@admin.tsu.edu.ph'))

  return (
    <nav className="flex items-center gap-4 border-b border-neutral-800 bg-black px-4 py-3 text-white">
      <Link className="text-sm font-medium text-white transition hover:text-indigo-200" to="/">
        Home
      </Link>
      {user && (
        <Link className="text-sm font-medium text-white transition hover:text-indigo-200" to="/">
          Dashboard
        </Link>
      )}
      <Link className="text-sm font-medium text-white transition hover:text-indigo-200" to="/login">
        Login
      </Link>
      <Link className="text-sm font-medium text-white transition hover:text-indigo-200" to="/register">
        Register
      </Link>
      {user && isAdmin && (
        <Link className="text-sm font-medium text-white transition hover:text-indigo-200" to="/admin">
          Admin
        </Link>
      )}
      {user ? (
        <button
          onClick={handleSignOut}
          className="ml-auto rounded-md border border-white/30 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-white/10 active:scale-95"
        >
          Sign out
        </button>
      ) : null}
    </nav>
  )
}

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth()
  if (isLoading) return <div className="px-6 py-8 text-sm text-neutral-700">Checking session...</div>
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function RequireProfile({ children }: { children: ReactNode }) {
  const { isProfileLoading, isProfileComplete } = useStudent()
  if (isProfileLoading) return <div className="px-6 py-8 text-sm text-neutral-700">Loading profile...</div>
  if (!isProfileComplete) return <Navigate to="/create-profile" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      <NavBar />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Routes>
          <Route
            path="/"
            element={
              <RequireAuth>
                <RequireProfile>
                  <StudentDashboardPage />
                </RequireProfile>
              </RequireAuth>
            }
          />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/create-profile"
            element={
              <RequireAuth>
                <CreateStudentProfilePage />
              </RequireAuth>
            }
          />
          <Route path="/admin" element={<AdminDashboardPage />} />
          <Route path="*" element={<div className="text-sm text-neutral-600">Not Found</div>} />
        </Routes>
      </main>
    </div>
  )
}
