import React, { type ReactNode } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { useStudent } from './context/StudentContext'
import Login from './components/auth/Login'
import Register from './components/auth/Register'
import AdminPage from './pages/AdminPage'
import StudentDashboardPage from './pages/StudentDashboardPage'
import JobsPage from './pages/JobsPage'
import CreateStudentProfilePage from './pages/CreateStudentProfilePage'

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
      <main className="mx-auto">
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
          <Route path="/admin" element={<AdminPage />} />
          <Route
            path="/jobs"
            element={
              <RequireAuth>
                <RequireProfile>
                  <JobsPage />
                </RequireProfile>
              </RequireAuth>
            }
          />
          <Route path="*" element={<div className="px-6 py-8 text-sm text-neutral-600">Not Found</div>} />
        </Routes>
      </main>
    </div>
  )
}
