import React from 'react'
import * as XLSX from 'xlsx'

const ReportsAnalytics = () => {
  const metrics = [
    { label: 'Active Students', value: '—', hint: 'Weekly actives and profile completion' },
    { label: 'Applications', value: '—', hint: 'Submissions and interview pass-through' },
    { label: 'Placements', value: '—', hint: 'Offers, starts, and acceptance rates' },
  ]

  const handleExport = () => {
    const worksheet = XLSX.utils.json_to_sheet(metrics)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Reports')
    XLSX.writeFile(workbook, 'reports_analytics.xlsx')
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-gradient-to-r from-slate-800 to-slate-600 p-6 text-white shadow-md">
        <h2 className="text-2xl font-bold">Reports & Analytics</h2>
        <p className="mt-2 max-w-2xl text-sm text-white/80">
          Monitor adoption, funnels, and employer engagement. Deeper dashboards and exports are on the way.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {metrics.map((metric) => (
          <div key={metric.label} className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
            <p className="text-sm font-semibold text-neutral-700">{metric.label}</p>
            <p className="mt-2 text-2xl font-bold text-neutral-900">{metric.value}</p>
            <p className="text-xs text-neutral-500">{metric.hint}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700">
        CSV exports, role-based dashboards, and Supabase-driven charts will be added soon.
      </div>
    </div>
  )
}

export default ReportsAnalytics
