import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

const STUDENT_DOMAIN = '@student.tsu.edu.ph'
const ADMIN_DOMAIN = '@admin.tsu.edu.ph'

export default function Login() {
	const { user, signIn, signUp } = useAuth()
	const navigate = useNavigate()
	const [mode, setMode] = useState('signin') // 'signin' | 'signup'
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [error, setError] = useState('')
	const [submitting, setSubmitting] = useState(false)

	useEffect(() => {
		if (user) navigate('/')
	}, [user, navigate])

	function getUserTypeFromEmail(email) {
		if (email.endsWith(ADMIN_DOMAIN)) return 'admin'
		if (email.endsWith(STUDENT_DOMAIN)) return 'student'
		return null
	}

	function validateEmail(email) {
		if (!email.endsWith(STUDENT_DOMAIN) && !email.endsWith(ADMIN_DOMAIN)) {
			return `Email must end with ${STUDENT_DOMAIN} or ${ADMIN_DOMAIN}`
		}
		return null
	}

	async function handleSubmit(event) {
		event.preventDefault()
		setError('')

		// Validate email domain
		const validationError = validateEmail(email)
		if (validationError) {
			setError(validationError)
			return
		}

		setSubmitting(true)
		try {
			if (mode === 'signin') {
				await signIn(email, password)
			} else {
				await signUp(email, password)
			}
			
			// Redirect based on email domain
			const userType = getUserTypeFromEmail(email)
			const redirectPath = userType === 'admin' ? '/admin' : '/'
			navigate(redirectPath)
		} catch (err) {
			setError(err.message || 'Something went wrong')
		} finally {
			setSubmitting(false)
		}
	}

	return (
		<div style={{ padding: 24, maxWidth: 400 }}>
			<h2 style={{ marginBottom: 8 }}>{mode === 'signin' ? 'Sign In' : 'Sign Up'}</h2>
			<p style={{ marginTop: 0, marginBottom: 12, fontSize: 14 }}>
				<strong>Valid email formats:</strong>
				<br />- Student: anything@student.tsu.edu.ph
				<br />- Admin: anything@admin.tsu.edu.ph
				<br />
				<br />
				<strong>Example (Admin):</strong> testadmin@admin.tsu.edu.ph
			</p>

			<form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
				<label>
					Email
					<input
						type="email"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						placeholder="Enter email"
						required
						style={{ width: '100%', padding: 8 }}
					/>
				</label>

				<label>
					Password
					<input
						type="password"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						placeholder="Enter password"
						required
						style={{ width: '100%', padding: 8 }}
					/>
				</label>

				{error ? (
					<div style={{ color: 'red', fontSize: 14 }}>{error}</div>
				) : null}

				<button type="submit" disabled={submitting} style={{ padding: 10 }}>
					{submitting ? 'Working...' : mode === 'signin' ? 'Sign In' : 'Sign Up'}
				</button>
			</form>

			<div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
				<button onClick={() => setMode('signin')} disabled={mode === 'signin'}>
					Go to Sign In
				</button>
				<button onClick={() => setMode('signup')} disabled={mode === 'signup'}>
					Go to Sign Up
				</button>
			</div>
		</div>
	)
}
