import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStudent } from '../context/StudentContext'

const initialState = {
	full_name: '',
	phone: '',
	university: '',
	major: '',
	graduation_year: '',
	bio: '',
}

export default function CreateStudentProfilePage() {
	const navigate = useNavigate()
	const { profile, isProfileLoading, saveProfile, isProfileComplete } = useStudent()
	const [formData, setFormData] = useState(initialState)
	const [message, setMessage] = useState('')
	const [error, setError] = useState('')

	const pageTitle = useMemo(
		() => (profile && isProfileComplete ? 'Update Profile' : 'Create Your Student Profile'),
		[profile, isProfileComplete]
	)

	useEffect(() => {
		if (profile) {
			setFormData({
				full_name: profile.full_name ?? '',
				phone: profile.phone ?? '',
				university: profile.university ?? '',
				major: profile.major ?? '',
				graduation_year: profile.graduation_year ?? '',
				bio: profile.bio ?? '',
			})
		}
	}, [profile])

	useEffect(() => {
		if (isProfileComplete) {
			navigate('/', { replace: true })
		}
	}, [isProfileComplete, navigate])

	function handleChange(e) {
		const { name, value } = e.target
		setFormData((prev) => ({ ...prev, [name]: value }))
	}

	async function handleSubmit(e) {
		e.preventDefault()
		setError('')
		setMessage('')
		const payload = {
			...formData,
			graduation_year: formData.graduation_year ? Number(formData.graduation_year) : null,
		}
		const { error: saveError } = await saveProfile(payload)
		if (saveError) {
			setError(saveError.message ?? 'Failed to save profile')
			return
		}
		setMessage('Profile saved successfully')
		navigate('/', { replace: true })
	}

	return (
		<div style={{ padding: 24, maxWidth: 720, margin: '0 auto' }}>
			<h1 style={{ marginBottom: 16 }}>{pageTitle}</h1>
			<p style={{ color: '#555', marginBottom: 24 }}>
				We need a few details to set up your student dashboard.
			</p>
			<form onSubmit={handleSubmit} style={{ display: 'grid', gap: 16 }}>
				<label style={{ display: 'grid', gap: 8 }}>
					<span>Full name *</span>
					<input
						type="text"
						name="full_name"
						value={formData.full_name}
						onChange={handleChange}
						required
					/>
				</label>
				<label style={{ display: 'grid', gap: 8 }}>
					<span>University *</span>
					<input
						type="text"
						name="university"
						value={formData.university}
						onChange={handleChange}
						required
					/>
				</label>
				<label style={{ display: 'grid', gap: 8 }}>
					<span>Major *</span>
					<input
						type="text"
						name="major"
						value={formData.major}
						onChange={handleChange}
						required
					/>
				</label>
				<label style={{ display: 'grid', gap: 8 }}>
					<span>Graduation year *</span>
					<input
						type="number"
						name="graduation_year"
						min="1900"
						max="2100"
						value={formData.graduation_year}
						onChange={handleChange}
						required
					/>
				</label>
				<label style={{ display: 'grid', gap: 8 }}>
					<span>Phone</span>
					<input
						type="tel"
						name="phone"
						value={formData.phone}
						onChange={handleChange}
					/>
				</label>
				<label style={{ display: 'grid', gap: 8 }}>
					<span>Short bio</span>
					<textarea
						name="bio"
						value={formData.bio}
						onChange={handleChange}
						rows={4}
					/>
				</label>
				<button type="submit" disabled={isProfileLoading} style={{ padding: '12px 16px' }}>
					{isProfileLoading ? 'Saving...' : 'Save profile'}
				</button>
			</form>
			{error && <p style={{ color: 'red', marginTop: 12 }}>{error}</p>}
			{message && <p style={{ color: 'green', marginTop: 12 }}>{message}</p>}
		</div>
	)
}
