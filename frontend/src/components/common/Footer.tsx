import React from 'react'

const Footer = () => {
  return (
    <footer className="mt-auto w-full border-t border-neutral-200 bg-white py-4 text-center text-sm text-neutral-600">
      <p>© {new Date().getFullYear()} University Careers. All rights reserved.</p>
    </footer>
  )
}

export default Footer
