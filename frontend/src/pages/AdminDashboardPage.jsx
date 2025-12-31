import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { isCurrentUserAdmin, getUserStats } from '../services/adminService'
import UserManagement from '../components/admin/UserManagement'
import JobManagement from '../components/admin/JobManagement'
import EventManagement from '../components/admin/EventManagement'
import InterviewManagement from '../components/admin/InterviewManagement'
import ReportsAnalytics from '../components/admin/ReportsAnalytics'
import '../styles/AdminDashboard.css'

const AdminDashboardPage = () => {
  const [activeTab, setActiveTab] = useState('users')
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalUsers: 0,
    students: 0,
    admins: 0,
    recruiters: 0
  })
  const navigate = useNavigate()

  useEffect(() => {
    checkAdminAccess()
  }, [])

  const checkAdminAccess = async () => {
    try {
      const adminStatus = await isCurrentUserAdmin()
      
      if (!adminStatus) {
        // Not an admin, redirect to home
        navigate('/')
        return
      }
      
      setIsAdmin(true)
      
      // Load statistics
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
      case 'reports':
        return <ReportsAnalytics />
      default:
        return <UserManagement />
    }
  }

  if (loading) {
    return (
      <div className="admin-dashboard-loading">
        <div className="spinner"></div>
        <p>Loading admin dashboard...</p>
      </div>
    )
  }

  if (!isAdmin) {
    return null // Will redirect
  }

  return (
    <div className="admin-dashboard">
      {/* Header */}
      <header className="admin-header">
        <h1>Admin Dashboard</h1>
        <div className="admin-header-actions">
          <button onClick={() => navigate('/')} className="btn-secondary">
            Back to Home
          </button>
        </div>
      </header>

      {/* Stats Overview */}
      <section className="admin-stats">
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <h3>{stats.totalUsers}</h3>
            <p>Total Users</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🎓</div>
          <div className="stat-content">
            <h3>{stats.students}</h3>
            <p>Students</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">👔</div>
          <div className="stat-content">
            <h3>{stats.recruiters}</h3>
            <p>Recruiters</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">⚙️</div>
          <div className="stat-content">
            <h3>{stats.admins}</h3>
            <p>Admins</p>
          </div>
        </div>
      </section>

      {/* Navigation Tabs */}
      <nav className="admin-tabs">
        <button
          className={`tab ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          👥 Users
        </button>
        <button
          className={`tab ${activeTab === 'jobs' ? 'active' : ''}`}
          onClick={() => setActiveTab('jobs')}
        >
          💼 Jobs
        </button>
        <button
          className={`tab ${activeTab === 'events' ? 'active' : ''}`}
          onClick={() => setActiveTab('events')}
        >
          📅 Events
        </button>
        <button
          className={`tab ${activeTab === 'interviews' ? 'active' : ''}`}
          onClick={() => setActiveTab('interviews')}
        >
          🎤 Interviews
        </button>
        <button
          className={`tab ${activeTab === 'reports' ? 'active' : ''}`}
          onClick={() => setActiveTab('reports')}
        >
          📊 Reports
        </button>
      </nav>

      {/* Tab Content */}
      <main className="admin-content">
        {renderTabContent()}
      </main>
    </div>
  )
}

export default AdminDashboardPage
