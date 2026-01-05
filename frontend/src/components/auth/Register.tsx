import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { signUp } from '../../services/authService'

interface FormState {
  email: string
  password: string
  confirmPassword: string
  fullName: string
  role: 'student' | 'recruiter'
  university: string
  major: string
  graduationYear: number
  phone: string
}

const Register = () => {
  const [formData, setFormData] = useState<FormState>({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    role: 'student',
    university: '',
    major: '',
    graduationYear: new Date().getFullYear() + 4,
    phone: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const validateForm = () => {
    if (!formData.email || !formData.password || !formData.fullName) {
      setError('Please fill in all required fields')
      return false
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long')
      return false
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return false
    }

    if (!formData.email.includes('@')) {
      setError('Please enter a valid email address')
      return false
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')

    if (!validateForm()) {
      return
    }

    setLoading(true)

    try {
      await signUp(formData.email, formData.password, {
        full_name: formData.fullName,
        role: formData.role,
        university: formData.university,
        major: formData.major,
        graduation_year: parseInt(String(formData.graduationYear), 10),
        phone: formData.phone,
      })

      alert('Registration successful! Please check your email to verify your account.')
      navigate('/login')
    } catch (err) {
      console.error('Registration error:', err)
      const message = err instanceof Error ? err.message : 'Failed to create account. Please try again.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const currentYear = new Date().getFullYear()
  const yearOptions = Array.from({ length: 11 }, (_, i) => currentYear + i)

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-600 to-fuchsia-600 px-4 py-12">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 text-center text-white">
          <p className="mb-3 inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white/80">
            Create your account
          </p>
          <h1 className="text-3xl font-bold leading-tight sm:text-4xl">Join UniversityApp</h1>
          <p className="mt-3 text-sm text-white/80">Sign up to start your career journey, track interviews, and connect with recruiters.</p>
        </div>

        <div className="rounded-3xl bg-white p-8 shadow-2xl shadow-indigo-500/20">
          {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

          <form onSubmit={handleSubmit} className="grid gap-5">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-1 text-sm font-semibold text-neutral-800">
                Full Name *
                <input
                  type="text"
                  id="fullName"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  placeholder="John Doe"
                  required
                  disabled={loading}
                  className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-base font-normal text-neutral-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 disabled:cursor-not-allowed disabled:bg-neutral-50"
                />
              </label>

              <label className="grid gap-1 text-sm font-semibold text-neutral-800">
                Email Address *
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="you@university.edu"
                  required
                  disabled={loading}
                  className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-base font-normal text-neutral-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 disabled:cursor-not-allowed disabled:bg-neutral-50"
                />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-1 text-sm font-semibold text-neutral-800">
                Password *
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="At least 6 characters"
                  required
                  disabled={loading}
                  className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-base font-normal text-neutral-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 disabled:cursor-not-allowed disabled:bg-neutral-50"
                />
              </label>

              <label className="grid gap-1 text-sm font-semibold text-neutral-800">
                Confirm Password *
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Re-enter your password"
                  required
                  disabled={loading}
                  className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-base font-normal text-neutral-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 disabled:cursor-not-allowed disabled:bg-neutral-50"
                />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-1 text-sm font-semibold text-neutral-800">
                I am a *
                <select
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  required
                  disabled={loading}
                  className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-base font-normal text-neutral-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 disabled:cursor-not-allowed disabled:bg-neutral-50"
                >
                  <option value="student">Student</option>
                  <option value="recruiter">Recruiter</option>
                </select>
                <span className="text-xs font-normal text-neutral-500">Admin access must be granted by an existing admin.</span>
              </label>

              <label className="grid gap-1 text-sm font-semibold text-neutral-800">
                Phone Number
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+1 (555) 123-4567"
                  disabled={loading}
                  className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-base font-normal text-neutral-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 disabled:cursor-not-allowed disabled:bg-neutral-50"
                />
              </label>
            </div>

            {formData.role === 'student' && (
              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-1 text-sm font-semibold text-neutral-800">
                  University
                  <input
                    type="text"
                    id="university"
                    name="university"
                    value={formData.university}
                    onChange={handleChange}
                    placeholder="e.g., Stanford University"
                    disabled={loading}
                    className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-base font-normal text-neutral-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 disabled:cursor-not-allowed disabled:bg-neutral-50"
                  />
                </label>

                <label className="grid gap-1 text-sm font-semibold text-neutral-800">
                  Major
                  <input
                    type="text"
                    id="major"
                    name="major"
                    value={formData.major}
                    onChange={handleChange}
                    placeholder="e.g., Computer Science"
                    disabled={loading}
                    className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-base font-normal text-neutral-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 disabled:cursor-not-allowed disabled:bg-neutral-50"
                  />
                </label>

                <label className="grid gap-1 text-sm font-semibold text-neutral-800">
                  Expected Graduation Year
                  <select
                    id="graduationYear"
                    name="graduationYear"
                    value={formData.graduationYear}
                    onChange={handleChange}
                    disabled={loading}
                    className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-base font-normal text-neutral-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 disabled:cursor-not-allowed disabled:bg-neutral-50"
                  >
                    {yearOptions.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex w-full items-center justify-center rounded-xl bg-indigo-600 px-4 py-3 text-base font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? 'Creating Account...' : 'Sign Up'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-neutral-600">
            Already have an account?{' '}
            <Link className="font-semibold text-indigo-600 hover:text-indigo-700" to="/login">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Register
