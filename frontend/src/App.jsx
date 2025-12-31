import React from 'react'
import { Routes, Route, Link, useNavigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import Login from './components/auth/Login'
import Register from './components/auth/Register'
import AdminDashboardPage from './pages/AdminDashboardPage'

function Home() {
	const { user } = useAuth()
	return (
		<div style={{ padding: 24 }}>
			<h1>University Career System</h1>
			<p>React frontend is set up. Start building features!</p>
			<p style={{ marginTop: 12 }}>
				Status: {user ? `Signed in as ${user.email}` : 'Not signed in'}
			</p>
		</div>
	)
}

function NavBar() {
	const { user, signOut } = useAuth()
	const navigate = useNavigate()

	async function handleSignOut() {
		await signOut()
		navigate('/login')
	}

	return (
		<nav style={{ padding: 12, borderBottom: '1px solid #333', display: 'flex', gap: 12, backgroundColor: '#000000', color: '#ffffff' }}>
			<Link to="/" style={{ color: '#ffffff' }}>Home</Link>
			<Link to="/login" style={{ color: '#ffffff' }}>Login</Link>
			<Link to="/register" style={{ color: '#ffffff' }}>Register</Link>
			{user && <Link to="/admin" style={{ color: '#ffffff' }}>Admin</Link>}
			{user ? (
				<button onClick={handleSignOut} style={{ marginLeft: 'auto' }}>
					Sign out
				</button>
			) : null}
		</nav>
	)
}

export default function App() {
	return (
		<div>
			<NavBar />
			<Routes>
				<Route path="/" element={<Home />} />
				<Route path="/login" element={<Login />} />
				<Route path="/register" element={<Register />} />
				<Route path="/admin" element={<AdminDashboardPage />} />
				<Route path="*" element={<div>Not Found</div>} />
			</Routes>
		</div>
	)
}
