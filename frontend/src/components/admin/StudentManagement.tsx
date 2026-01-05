import React from 'react'

const StudentManagement = () => {
  const checkpoints = [
    { icon: '🎯', title: 'Profiles', detail: 'Track completion, majors, and graduation years.' },
    { icon: '📄', title: 'Resumes', detail: 'Review uploads and flag students who need updates.' },
    { icon: '🤝', title: 'Engagement', detail: 'Watch interview prep, mock sessions, and event attendance.' },
  ]

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 p-6 text-white shadow-md">
        <h2 className="text-2xl font-bold">Student Management</h2>
        <p className="mt-2 max-w-2xl text-sm text-white/85">
          Oversee student readiness, materials, and engagement so every candidate is employer-ready.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {checkpoints.map((item) => (
          <div key={item.title} className="flex gap-3 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-xl">{item.icon}</div>
            <div>
              <h3 className="text-sm font-semibold text-neutral-900">{item.title}</h3>
              <p className="text-sm text-neutral-600">{item.detail}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700">
        Detailed student lists, filters, and Supabase-backed actions will be added in the next iteration.
      </div>
    </div>
  )
}

export default StudentManagement
