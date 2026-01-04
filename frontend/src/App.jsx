import React from 'react'
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

	const isAdmin = user?.email?.endsWith('@admin.tsu.edu.ph')

	return (
		<nav style={{ padding: 12, borderBottom: '1px solid #333', display: 'flex', gap: 12, backgroundColor: '#000000', color: '#ffffff' }}>
			<Link to="/" style={{ color: '#ffffff' }}>Home</Link>
			{user && <Link to="/" style={{ color: '#ffffff' }}>Dashboard</Link>}
			<Link to="/login" style={{ color: '#ffffff' }}>Login</Link>
			<Link to="/register" style={{ color: '#ffffff' }}>Register</Link>
			{user && isAdmin && <Link to="/admin" style={{ color: '#ffffff' }}>Admin</Link>}
			{user ? (
				<button onClick={handleSignOut} style={{ marginLeft: 'auto' }}>
					Sign out
				</button>
			) : null}
		</nav>
	)
}

function RequireAuth({ children }) {
	const { user, isLoading } = useAuth()
	if (isLoading) return <div style={{ padding: 24 }}>Checking session...</div>
	if (!user) return <Navigate to="/login" replace />
	return children
}

function RequireProfile({ children }) {
	const { isProfileLoading, isProfileComplete } = useStudent()
	if (isProfileLoading) return <div style={{ padding: 24 }}>Loading profile...</div>
	if (!isProfileComplete) return <Navigate to="/create-profile" replace />
	return children
}

export default function App() {
	return (
		<div>
			<NavBar />
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
				<Route path="*" element={<div>Not Found</div>} />
			</Routes>
		</div>
	)
}
