import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStudent } from '../context/StudentContext'

interface ProfileForm {
  full_name: string
  phone: string
  university: string
  major: string
  graduation_year: string | number | null
  bio: string
}

const initialState: ProfileForm = {
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
  const [formData, setFormData] = useState<ProfileForm>(initialState)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const pageTitle = useMemo(() => (profile && isProfileComplete ? 'Update Profile' : 'Create Your Student Profile'), [
    profile,
    isProfileComplete,
  ])

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

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
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
    <div className="mx-auto max-w-3xl rounded-2xl bg-white p-8 shadow-sm ring-1 ring-neutral-200/60">
      <div className="mb-6 space-y-2">
        <h1 className="text-2xl font-bold text-neutral-900">{pageTitle}</h1>
        <p className="text-sm text-neutral-600">We need a few details to set up your student dashboard.</p>
      </div>
      <form className="grid gap-5" onSubmit={handleSubmit}>
        <label className="grid gap-1 text-sm font-semibold text-neutral-800">
          Full name *
          <input
            type="text"
            name="full_name"
            value={formData.full_name}
            onChange={handleChange}
            required
            className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-base font-normal text-neutral-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
          />
        </label>
        <label className="grid gap-1 text-sm font-semibold text-neutral-800">
          University *
          <input
            type="text"
            name="university"
            value={formData.university}
            onChange={handleChange}
            required
            className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-base font-normal text-neutral-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
        />
        </label>
        <label className="grid gap-1 text-sm font-semibold text-neutral-800">
          Major *
        <input
            type="text"
            name="major"
            value={formData.major}
            onChange={handleChange}
            required
            className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-base font-normal text-neutral-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
        />
        </label>
        <label className="grid gap-1 text-sm font-semibold text-neutral-800">
          Graduation year *
        <input
            type="number"
            name="graduation_year"
            min="1900"
            max="2100"
            value={formData.graduation_year ?? ''}
            onChange={handleChange}
            required
            className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-base font-normal text-neutral-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
        />
        </label>
        <label className="grid gap-1 text-sm font-semibold text-neutral-800">
        Phone
        <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-base font-normal text-neutral-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
        />
        </label>
        <label className="grid gap-1 text-sm font-semibold text-neutral-800">
          Short bio
          <textarea
            name="bio"
            value={formData.bio}
            onChange={handleChange}
            rows={4}
            className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-base font-normal text-neutral-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
          />
        </label>
        <button
          type="submit"
          disabled={isProfileLoading}
          className="mt-2 inline-flex w-full items-center justify-center rounded-xl bg-indigo-600 px-4 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isProfileLoading ? 'Saving...' : 'Save profile'}
        </button>
      </form>
      {error && <p className="mt-3 text-sm font-semibold text-red-600">{error}</p>}
      {message && <p className="mt-3 text-sm font-semibold text-green-600">{message}</p>}
    </div>
  )
}
