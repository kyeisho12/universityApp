import React from 'react'
import { useNavigate } from 'react-router-dom'

const NotFound = () => {
  const navigate = useNavigate()

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <div className="max-w-md rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-neutral-200/60">
        <h1 className="text-3xl font-bold text-neutral-900">404</h1>
        <p className="mt-2 text-neutral-600">Page not found.</p>
        <button
          onClick={() => navigate('/')}
          className="mt-6 inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
        >
          Go Home
        </button>
      </div>
    </div>
  )
}

export default NotFound
