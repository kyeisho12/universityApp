import React from 'react'

const JobManagement = () => {
  const roadmap = [
    { icon: '💼', title: 'Postings', detail: 'Curate and approve employer job posts before they go live.' },
    { icon: '🧭', title: 'Workflows', detail: 'Route promising roles to matching student segments and advisors.' },
    { icon: '📈', title: 'Performance', detail: 'Track apply/start/offer funnels by campus and major.' },
  ]

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-fuchsia-600 p-6 text-white shadow-md">
        <h2 className="text-2xl font-bold">Job Management</h2>
        <p className="mt-2 max-w-2xl text-sm text-white/80">
          Publish and monitor roles, coordinate with recruiters, and keep students aligned with the best-fit opportunities.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {roadmap.map((item) => (
          <div key={item.title} className="flex gap-3 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-xl">{item.icon}</div>
            <div>
              <h3 className="text-sm font-semibold text-neutral-900">{item.title}</h3>
              <p className="text-sm text-neutral-600">{item.detail}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700">
        Detailed job posting workflows, approval queues, and recruiter integrations are coming soon.
      </div>
    </div>
  )
}

export default JobManagement
