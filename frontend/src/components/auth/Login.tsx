import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

const STUDENT_DOMAIN = '@student.tsu.edu.ph'
const ADMIN_DOMAIN = '@admin.tsu.edu.ph'

type Mode = 'signin' | 'signup'

type AuthError = string | null

export default function Login() {
  const { user, signIn, signUp } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<AuthError>('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (user) navigate('/')
  }, [user, navigate])

  function getUserTypeFromEmail(nextEmail: string) {
    if (nextEmail.endsWith(ADMIN_DOMAIN)) return 'admin'
    if (nextEmail.endsWith(STUDENT_DOMAIN)) return 'student'
    return null
  }

  function validateEmail(nextEmail: string) {
    if (!nextEmail.endsWith(STUDENT_DOMAIN) && !nextEmail.endsWith(ADMIN_DOMAIN)) {
      return `Email must end with ${STUDENT_DOMAIN} or ${ADMIN_DOMAIN}`
    }
    return null
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    const validationError = validateEmail(email)
    if (validationError) {
      setError(validationError)
      return
    }

    setSubmitting(true)
    try {
      if (mode === 'signin') {
        await signIn(email, password)
      } else {
        await signUp(email, password)
      }

      const userType = getUserTypeFromEmail(email)
      const redirectPath = userType === 'admin' ? '/admin' : '/'
      navigate(redirectPath)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong'
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-600 to-fuchsia-600 px-4 py-12">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 lg:flex-row lg:items-center">
        <div className="text-white lg:w-5/12">
          <p className="mb-3 inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white/90">
            Secure Access
          </p>
          <h1 className="text-3xl font-bold leading-tight sm:text-4xl">
            Welcome back. Sign {mode === 'signin' ? 'in' : 'up'} to continue.
          </h1>
          <p className="mt-4 text-sm text-white/80">
            Use your university-issued email. Admins must use the {ADMIN_DOMAIN} domain and students the {STUDENT_DOMAIN} domain.
          </p>
          <div className="mt-6 space-y-2 rounded-2xl bg-white/10 p-4 text-sm backdrop-blur">
            <p className="font-semibold text-white">Allowed formats</p>
            <ul className="space-y-1 text-white/80">
              <li>Student: anything{STUDENT_DOMAIN}</li>
              <li>Admin: anything{ADMIN_DOMAIN}</li>
              <li className="text-white/70">Example admin: testadmin{ADMIN_DOMAIN}</li>
            </ul>
          </div>
        </div>

        <div className="w-full lg:w-7/12">
          <div className="rounded-2xl bg-white p-8 shadow-2xl shadow-indigo-500/20">
            <div className="mb-6 flex gap-3">
              <button
                onClick={() => setMode('signin')}
                className={`flex-1 rounded-xl px-4 py-2 text-sm font-semibold transition ${mode === 'signin' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'}`}
              >
                Sign In
              </button>
              <button
                onClick={() => setMode('signup')}
                className={`flex-1 rounded-xl px-4 py-2 text-sm font-semibold transition ${mode === 'signup' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'}`}
              >
                Sign Up
              </button>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <label className="block space-y-1 text-sm font-semibold text-neutral-800">
                <span>Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={`name${STUDENT_DOMAIN}`}
                  required
                  className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-base font-normal text-neutral-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                />
              </label>

              <label className="block space-y-1 text-sm font-semibold text-neutral-800">
                <span>Password</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-base font-normal text-neutral-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                />
              </label>

              {error ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={submitting}
                className="flex w-full items-center justify-center rounded-xl bg-indigo-600 px-4 py-3 text-base font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submitting ? 'Working...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
