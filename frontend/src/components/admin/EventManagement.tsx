import React from 'react'

const EventManagement = () => {
  const highlights = [
    { icon: '📅', title: 'Scheduling', detail: 'Plan campus fairs, info sessions, and workshops with clean timelines.' },
    { icon: '🧾', title: 'RSVPs', detail: 'Capture registrations, reminders, and follow-up touchpoints.' },
    { icon: '🧭', title: 'On-site Ops', detail: 'Prep check-in flows, badges, and room assignments.' },
  ]

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-600 p-6 text-white shadow-md">
        <h2 className="text-2xl font-bold">Event Management</h2>
        <p className="mt-2 max-w-2xl text-sm text-white/85">
          Organize recruiting events, track attendance, and keep employers and students aligned on logistics.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {highlights.map((item) => (
          <div key={item.title} className="flex gap-3 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-xl">{item.icon}</div>
            <div>
              <h3 className="text-sm font-semibold text-neutral-900">{item.title}</h3>
              <p className="text-sm text-neutral-600">{item.detail}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700">
        Detailed event creation, RSVPs, and attendance reporting are coming soon.
      </div>
    </div>
  )
}

export default EventManagement
