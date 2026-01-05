import React, { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useStudent } from '../context/StudentContext'

export default function StudentDashboardPage() {
  const { user } = useAuth()
  const { profile } = useStudent()
  const [showProfile, setShowProfile] = useState(false)

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-neutral-200/60">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">Student Dashboard</p>
            <h1 className="text-2xl font-bold text-neutral-900">Welcome {user ? user.email : 'Guest'}</h1>
            <p className="text-sm text-neutral-600">Status: {user ? 'Signed in' : 'Not signed in'}</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowProfile((prev) => !prev)}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            >
              {showProfile ? 'Hide Profile' : 'View Profile'}
            </button>
          </div>
        </div>
      </div>

      {showProfile && profile && (
        <div className="max-w-2xl rounded-2xl bg-white p-6 shadow-sm ring-1 ring-neutral-200/60">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-neutral-900">Profile details</h2>
            <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-600">Up to date</span>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-neutral-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase text-neutral-500">Name</p>
              <p className="text-sm text-neutral-900">{profile.full_name}</p>
            </div>
            <div className="rounded-xl bg-neutral-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase text-neutral-500">University</p>
              <p className="text-sm text-neutral-900">{profile.university}</p>
            </div>
            <div className="rounded-xl bg-neutral-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase text-neutral-500">Major</p>
              <p className="text-sm text-neutral-900">{profile.major}</p>
            </div>
            <div className="rounded-xl bg-neutral-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase text-neutral-500">Graduation Year</p>
              <p className="text-sm text-neutral-900">{profile.graduation_year}</p>
            </div>
            {profile.phone && (
              <div className="rounded-xl bg-neutral-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase text-neutral-500">Phone</p>
                <p className="text-sm text-neutral-900">{profile.phone}</p>
              </div>
            )}
            {profile.bio && (
              <div className="rounded-xl bg-neutral-50 px-4 py-3 sm:col-span-2">
                <p className="text-xs font-semibold uppercase text-neutral-500">Bio</p>
                <p className="text-sm text-neutral-900">{profile.bio}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
