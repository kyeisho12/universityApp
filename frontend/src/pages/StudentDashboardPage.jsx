import React, { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useStudent } from '../context/StudentContext'

export default function StudentDashboardPage() {
	const { user } = useAuth()
	const { profile } = useStudent()
	const [showProfile, setShowProfile] = useState(false)

	return (
		<div style={{ padding: 24 }}>
			<h1>Student Dashboard</h1>
			<p style={{ marginTop: 12 }}>
				Status: {user ? `Signed in as ${user.email}` : 'Not signed in'}
			</p>
			<div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
				<button onClick={() => setShowProfile((prev) => !prev)} style={{ padding: '10px 14px' }}>
					{showProfile ? 'Hide Profile' : 'View Profile'}
				</button>
			</div>
			{showProfile && profile && (
				<div style={{ marginTop: 20, border: '1px solid #ddd', padding: 16, borderRadius: 4, maxWidth: 560 }}>
					<h2 style={{ marginBottom: 8 }}>Profile Details</h2>
					<p><strong>Name:</strong> {profile.full_name}</p>
					<p><strong>University:</strong> {profile.university}</p>
					<p><strong>Major:</strong> {profile.major}</p>
					<p><strong>Graduation year:</strong> {profile.graduation_year}</p>
					{profile.phone && <p><strong>Phone:</strong> {profile.phone}</p>}
					{profile.bio && <p><strong>Bio:</strong> {profile.bio}</p>}
				</div>
			)}
		</div>
	)
}
