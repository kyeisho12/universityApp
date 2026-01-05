import React from 'react'
import { Link } from 'react-router-dom'

const Navbar = () => {
  return (
    <nav className="w-full border-b border-neutral-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link to="/" className="text-lg font-bold text-indigo-700">
          Uni Careers
        </Link>
        <div className="flex items-center gap-4 text-sm font-semibold text-neutral-700">
          <Link to="/jobs" className="hover:text-indigo-600">
            Jobs
          </Link>
          <Link to="/events" className="hover:text-indigo-600">
            Events
          </Link>
          <Link to="/interviews" className="hover:text-indigo-600">
            Interviews
          </Link>
        </div>
      </div>
    </nav>
  )
}

export default Navbar
