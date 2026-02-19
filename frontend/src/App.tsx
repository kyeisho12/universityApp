import React, { type ReactNode } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { useStudent } from './context/StudentContext'
import Login from './components/auth/Login'
import Register from './components/auth/Register'
import AdminPage from './pages/AdminPage'
import StudentDashboardPage from './pages/StudentDashboardPage'
import JobsPage from './pages/JobsPage'
import ResumesPage from './pages/ResumesPage'
import CoverLettersPage from './pages/CoverLettersPage'
import EventsPage from './pages/EventsPage'
import MockInterviewPage from './pages/MockInterviewPage'
import CreateStudentProfilePage from './pages/CreateStudentProfilePage'
import StudentProfilePage from './pages/StudentProfilePage.tsx'
import ApplicationsPage from './pages/ApplicationsPage'
import MyApplicationsPage from './pages/MyApplicationsPage'
import ApplyOutlookPage from './pages/ApplyOutlookPage'
import EmployerPartners from './components/admin/EmployerPartners'
import StudentAnalytics from './components/admin/StudentAnalytics'
import AdminMockInterview from './components/admin/AdminMockInterview'
import ManageStudents from './components/admin/ManageStudents'
import AdminCareerEvents from './components/admin/AdminCareerEvents'
import Settings from './pages/Settings'

// Simple test components that don't require auth
function TestEventsPage() {
  const [events, setEvents] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [registered, setRegistered] = React.useState<Set<string>>(new Set())

  React.useEffect(() => {
    fetch('http://localhost:3001/api/events/')
      .then(r => r.json())
      .then(d => {
        setEvents(d.data || [])
        setLoading(false)
      })
      .catch(e => {
        console.error('Error:', e)
        setLoading(false)
      })
  }, [])

  const handleRegister = async (eventId: string) => {
    try {
      const res = await fetch(`http://localhost:3001/api/events/${eventId}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id: 'test-student' })
      })
      const data = await res.json()
      setEvents(events.map(e => e.id === eventId ? data.data : e))
      setRegistered(new Set([...registered, eventId]))
    } catch (e) {
      console.error('Error:', e)
    }
  }

  const handleUnregister = async (eventId: string) => {
    try {
      const res = await fetch(`http://localhost:3001/api/events/${eventId}/unregister`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id: 'test-student' })
      })
      const data = await res.json()
      setEvents(events.map(e => e.id === eventId ? data.data : e))
      const newSet = new Set(registered)
      newSet.delete(eventId)
      setRegistered(newSet)
    } catch (e) {
      console.error('Error:', e)
    }
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8">Career Events (Student View)</h1>
      {loading && <p>Loading...</p>}
      {!loading && events.length === 0 && <p>No events</p>}
      <div className="grid gap-4">
        {events.map((e: any) => (
          <div key={e.id} className="border p-4 rounded-lg">
            <h2 className="font-bold">{e.title}</h2>
            <p>{e.description}</p>
            <p className="text-sm text-gray-600">{e.date} at {e.time}</p>
            <p className="text-sm text-gray-600">{e.location}</p>
            <p className="text-sm text-gray-600">Registered: {e.registered || 0}</p>
            <button
              onClick={() => registered.has(e.id) ? handleUnregister(e.id) : handleRegister(e.id)}
              className={`mt-2 px-4 py-2 rounded ${registered.has(e.id) ? 'bg-gray-300' : 'bg-blue-600 text-white'}`}
            >
              {registered.has(e.id) ? 'Cancel' : 'Register'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

function TestAdminEventsPage() {
  const [events, setEvents] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [showForm, setShowForm] = React.useState(false)
  const [formData, setFormData] = React.useState({
    title: '',
    description: '',
    event_type: 'Job Fair',
    date: '',
    time: '',
    location: ''
  })

  const fetchEvents = () => {
    fetch('http://localhost:3001/api/events/')
      .then(r => r.json())
      .then(d => {
        setEvents(d.data || [])
        setLoading(false)
      })
      .catch(e => console.error('Error:', e))
  }

  React.useEffect(() => {
    fetchEvents()
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    fetch('http://localhost:3001/api/events/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    })
      .then(r => r.json())
      .then(() => {
        setFormData({ title: '', description: '', event_type: 'Job Fair', date: '', time: '', location: '' })
        setShowForm(false)
        fetchEvents()
      })
      .catch(e => console.error('Error:', e))
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8">Career Events (Admin View)</h1>
      <button
        onClick={() => setShowForm(!showForm)}
        className="mb-4 bg-blue-600 text-white px-4 py-2 rounded"
      >
        {showForm ? 'Cancel' : 'Add Event'}
      </button>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-8 border p-4 rounded-lg">
          <input
            type="text"
            placeholder="Title"
            value={formData.title}
            onChange={(e) => setFormData({...formData, title: e.target.value})}
            className="block w-full mb-2 p-2 border rounded"
            required
          />
          <input
            type="text"
            placeholder="Description"
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            className="block w-full mb-2 p-2 border rounded"
            required
          />
          <select
            value={formData.event_type}
            onChange={(e) => setFormData({...formData, event_type: e.target.value})}
            className="block w-full mb-2 p-2 border rounded"
          >
            <option>Job Fair</option>
            <option>Workshop</option>
            <option>Seminar</option>
            <option>Webinar</option>
          </select>
          <input
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({...formData, date: e.target.value})}
            className="block w-full mb-2 p-2 border rounded"
            required
          />
          <input
            type="time"
            value={formData.time}
            onChange={(e) => setFormData({...formData, time: e.target.value})}
            className="block w-full mb-2 p-2 border rounded"
            required
          />
          <input
            type="text"
            placeholder="Location"
            value={formData.location}
            onChange={(e) => setFormData({...formData, location: e.target.value})}
            className="block w-full mb-2 p-2 border rounded"
            required
          />
          <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded">
            Create Event
          </button>
        </form>
      )}

      {loading && <p>Loading...</p>}
      <div className="grid gap-4">
        {events.map((e: any) => (
          <div key={e.id} className="border p-4 rounded-lg">
            <h2 className="font-bold">{e.title}</h2>
            <p>{e.description}</p>
            <p className="text-sm text-gray-600">{e.date} at {e.time}</p>
            <p className="text-sm text-gray-600">{e.location}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

const ADMIN_DOMAIN = '@admin.tsu.edu.ph'

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth()
  if (isLoading) return <div className="px-6 py-8 text-sm text-neutral-700">Checking session...</div>
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function RequireAdmin({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth()
  if (isLoading) return <div className="px-6 py-8 text-sm text-neutral-700">Checking session...</div>
  if (!user) return <Navigate to="/login" replace />
  if (!user.email?.endsWith(ADMIN_DOMAIN)) return <Navigate to="/student/dashboard" replace />
  return <>{children}</>
}

function RequireStudent({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth()
  if (isLoading) return <div className="px-6 py-8 text-sm text-neutral-700">Checking session...</div>
  if (!user) return <Navigate to="/login" replace />
  if (user.email?.endsWith(ADMIN_DOMAIN)) return <Navigate to="/admin/dashboard" replace />
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
          <Route path="/" element={<Navigate to="/student/dashboard" replace />} />
          <Route
            path="/student/dashboard"
            element={
              <RequireStudent>
                <RequireProfile>
                  <StudentDashboardPage />
                </RequireProfile>
              </RequireStudent>
            }
          />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/test/events" element={<TestEventsPage />} />
          <Route path="/test/admin/events" element={<TestAdminEventsPage />} />
          <Route
            path="/create-profile"
            element={
              <RequireAuth>
                <CreateStudentProfilePage />
              </RequireAuth>
            }
          />
          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/admin/dashboard" element={<RequireAdmin>
                <AdminPage />
              </RequireAdmin>} />
          <Route
            path="/student/jobs"
            element={
              <RequireStudent>
                <RequireProfile>
                  <JobsPage />
                </RequireProfile>
              </RequireStudent>
            }
          />
          <Route
            path="/student/applications"
            element={
              <RequireStudent>
                <RequireProfile>
                  <MyApplicationsPage />
                </RequireProfile>
              </RequireStudent>
            }
          />
          <Route
            path="/student/apply-outlook"
            element={
              <RequireStudent>
                <RequireProfile>
                  <ApplyOutlookPage />
                </RequireProfile>
              </RequireStudent>
            }
          />
          <Route
            path="/student/resumes"
            element={
              <RequireStudent>
                <RequireProfile>
                  <ResumesPage />
                </RequireProfile>
              </RequireStudent>
            }
          />
          <Route
            path="/student/cover-letters"
            element={
              <RequireStudent>
                <RequireProfile>
                  <CoverLettersPage />
                </RequireProfile>
              </RequireStudent>
            }
          />
          <Route
            path="/student/events"
            element={
              <RequireStudent>
                <RequireProfile>
                  <EventsPage />
                </RequireProfile>
              </RequireStudent>
            }
          />
          <Route
            path="/student/interview"
            element={
              <RequireStudent>
                <RequireProfile>
                  <MockInterviewPage />
                </RequireProfile>
              </RequireStudent>
            }
          />
          <Route
            path="/student/profile"
            element={
              <RequireStudent>
                <RequireProfile>
                  <StudentProfilePage />
                </RequireProfile>
              </RequireStudent>
            }
          />
          <Route
            path="/admin/employer_partners"
            element={
              <RequireAdmin>
                <EmployerPartners />
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/student_analytics"
            element={
              <RequireAdmin>
                <StudentAnalytics />
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/career_events"
            element={
              <RequireAdmin>
                <AdminCareerEvents />
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/mock_interview"
            element={
              <RequireAdmin>
                <AdminMockInterview />
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/applications"
            element={
              <RequireAdmin>
                <ApplicationsPage />
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/manage_students"
            element={
              <RequireAdmin>
                <ManageStudents />
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/settings"
            element={
              <RequireAdmin>
                <Settings />
              </RequireAdmin>
            }
          />
          <Route path="*" element={<div className="min-h-screen bg-neutral-50 flex items-center justify-center text-sm text-neutral-600">Not Found</div>} />
        </Routes>
      </main>
    </div>
  )
}
