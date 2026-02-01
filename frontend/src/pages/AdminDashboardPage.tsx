import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { isCurrentUserAdmin, getUserStats } from '../services/adminService'
import UserManagement from '../components/admin/UserManagement'
import JobManagement from '../components/admin/JobManagement'
import EventManagement from '../components/admin/EventManagement'
import InterviewManagement from '../components/admin/InterviewManagement'
import ReportsAnalytics from '../components/admin/ReportsAnalytics'
import { ApplicationManagement } from '../components/admin/ApplicationManagement'

interface Stats {
  totalUsers: number
  students: number
  admins: number
  recruiters: number
}

type TabKey = 'users' | 'jobs' | 'events' | 'interviews' | 'reports' | 'applications'

const AdminDashboardPage = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('users')
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    students: 0,
    admins: 0,
    recruiters: 0,
  })
  const navigate = useNavigate()
  const { signOut } = useAuth()

  useEffect(() => {
    checkAdminAccess()
  }, [])

  const checkAdminAccess = async () => {
    try {
      const adminStatus = await isCurrentUserAdmin()

      if (!adminStatus) {
        navigate('/')
        return
      }

      setIsAdmin(true)

      const userStats = await getUserStats()
      setStats(userStats)
    } catch (error) {
      console.error('Error checking admin access:', error)
      navigate('/')
    } finally {
      setLoading(false)
    }
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'users':
        return <UserManagement />
      case 'jobs':
        return <JobManagement />
      case 'events':
        return <EventManagement />
      case 'interviews':
        return <InterviewManagement />
      case 'applications':
        return <ApplicationManagement />
      case 'reports':
        return <ReportsAnalytics />
      default:
        return <UserManagement />
    }
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 text-neutral-700">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600"></div>
        <p className="mt-4 text-sm font-medium">Loading admin dashboard...</p>
      </div>
    )
  }

  if (!isAdmin) {
    return null
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-gradient-to-r from-indigo-600 via-purple-600 to-fuchsia-600 px-6 py-5 text-white shadow-lg">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-white/80">Admin Console</p>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          </div>
          <button
            onClick={handleSignOut}
            className="inline-flex items-center justify-center rounded-xl border border-white/30 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10 active:scale-95"
          >
            Sign out
          </button>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl gap-4 px-4 py-6 md:grid-cols-2 xl:grid-cols-4">
        <div className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-neutral-200/60">
          <div className="text-3xl">👥</div>
          <div>
            <p className="text-2xl font-bold text-neutral-900">{stats.totalUsers}</p>
            <p className="text-sm text-neutral-500">Total Users</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-neutral-200/60">
          <div className="text-3xl">🎓</div>
          <div>
            <p className="text-2xl font-bold text-neutral-900">{stats.students}</p>
            <p className="text-sm text-neutral-500">Students</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-neutral-200/60">
          <div className="text-3xl">👔</div>
          <div>
            <p className="text-2xl font-bold text-neutral-900">{stats.recruiters}</p>
            <p className="text-sm text-neutral-500">Recruiters</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-neutral-200/60">
          <div className="text-3xl">⚙️</div>
          <div>
            <p className="text-2xl font-bold text-neutral-900">{stats.admins}</p>
            <p className="text-sm text-neutral-500">Admins</p>
          </div>
        </div>
      </section>

      <nav className="mx-auto flex max-w-6xl gap-2 px-4">
        {[
          { key: 'users', label: '👥 Users' },
          { key: 'jobs', label: '💼 Jobs' },
          { key: 'applications', label: '📋 Applications' },
          { key: 'events', label: '📅 Events' },
          { key: 'interviews', label: '🎤 Interviews' },
          { key: 'reports', label: '📊 Reports' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as TabKey)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
              activeTab === tab.key
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-300/60'
                : 'bg-white text-neutral-700 ring-1 ring-neutral-200/80 hover:bg-neutral-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-neutral-200/60">{renderTabContent()}</div>
      </main>
    </div>
  )
}

export default AdminDashboardPage
