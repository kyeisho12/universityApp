import React from 'react'
import { NavLink } from 'react-router-dom'

const Sidebar = () => {
  const links = [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/jobs', label: 'Jobs' },
    { to: '/events', label: 'Events' },
  ]

  return (
    <aside className="w-56 space-y-1 rounded-2xl border border-neutral-200 bg-white p-4 text-sm font-semibold text-neutral-700 shadow-sm">
      {links.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          className={({ isActive }) =>
            `block rounded-xl px-3 py-2 transition ${isActive ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-neutral-50'}`
          }
        >
          {link.label}
        </NavLink>
      ))}
    </aside>
  )
}

export default Sidebar
