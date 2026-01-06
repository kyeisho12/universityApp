import React from 'react'

const InterviewManagement = () => {
  const steps = [
    { icon: '🎤', title: 'Scheduling', detail: 'Coordinate time slots, panels, and virtual rooms.' },
    { icon: '🧑‍💻', title: 'Prep Packs', detail: 'Share interviewer guides and candidate resumes in one place.' },
    { icon: '📝', title: 'Feedback', detail: 'Capture structured notes and move candidates forward quickly.' },
  ]

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-gradient-to-r from-indigo-500 via-blue-500 to-cyan-500 p-6 text-white shadow-md">
        <h2 className="text-2xl font-bold">Interview Management</h2>
        <p className="mt-2 max-w-2xl text-sm text-white/85">
          Streamline scheduling, interviewer prep, and feedback loops for on-campus and remote interviews.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {steps.map((item) => (
          <div key={item.title} className="flex gap-3 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-xl">{item.icon}</div>
            <div>
              <h3 className="text-sm font-semibold text-neutral-900">{item.title}</h3>
              <p className="text-sm text-neutral-600">{item.detail}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700">
        Advanced scheduling, interviewer assignments, and evaluation templates will arrive shortly.
      </div>
    </div>
  )
}

export default InterviewManagement
