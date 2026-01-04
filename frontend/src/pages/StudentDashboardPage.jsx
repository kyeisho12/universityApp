import React from 'react'
import { useAuth } from '../hooks/useAuth'

export default function StudentDashboardPage() {
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
