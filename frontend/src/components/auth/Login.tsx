import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'

const STUDENT_DOMAIN = '@student.tsu.edu.ph'
const ADMIN_DOMAIN = '@admin.tsu.edu.ph'

type View = 'login' | 'signup'

type LoginFormProps = {
  onLogin: (email: string, password: string) => Promise<void>
  onSignUpClick: () => void
}

type SignUpFormProps = {
  onSignUp: (email: string, password: string, fullName: string) => Promise<void>
  onBack: () => void
}

function LoginForm({ onLogin, onSignUpClick }: LoginFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')

    if (!email.endsWith(STUDENT_DOMAIN) && !email.endsWith(ADMIN_DOMAIN)) {
      setError(`Please use your university email (${STUDENT_DOMAIN} or ${ADMIN_DOMAIN})`)
      return
    }

    setIsLoading(true)
    try {
      await onLogin(email, password)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl p-6 sm:p-8 md:p-12 w-full max-w-md">
      <div className="flex items-center gap-2 sm:gap-3 mb-8 sm:mb-12">
        <div className="w-12 h-12 sm:w-16 sm:h-16 bg-[#1B2744] rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6 sm:h-8 sm:w-8 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l9-5-9-5-9 5 9 5z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l6.16-3.422A12.083 12.083 0 0112 21a12.083 12.083 0 01-6.16-10.422L12 14z" />
          </svg>
        </div>
        <div>
          <h1 className="text-[#1B2744] text-base sm:text-xl font-bold font-serif leading-tight">TSU Career</h1>
          <p className="text-gray-400 text-xs sm:text-sm font-medium">Management System</p>
        </div>
      </div>

      <div className="mb-6 sm:mb-8">
        <h2 className="text-[#1B2744] text-2xl sm:text-3xl md:text-4xl font-bold mb-1 sm:mb-2 italic font-serif">Welcome back</h2>
        <p className="text-gray-500 text-sm sm:text-base">Sign in to access your portal</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
        <div className="space-y-2">
          <label className="block text-xs sm:text-sm font-medium text-gray-800">Email Address</label>
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl sm:rounded-2xl border-2 border-gray-200 px-4 sm:px-5 py-3 sm:py-3.5 text-sm sm:text-base placeholder-gray-400 focus:border-[#1B2744] focus:ring-0 outline-none transition-colors text-gray-700"
            required
          />
          {error && <p className="text-red-500 text-xs sm:text-sm">{error}</p>}
        </div>

        <div className="space-y-2 relative">
          <label className="block text-xs sm:text-sm font-medium text-gray-800">Password</label>
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl sm:rounded-2xl border-2 border-gray-200 px-4 sm:px-5 py-3 sm:py-3.5 text-sm sm:text-base placeholder-gray-400 focus:border-[#1B2744] focus:ring-0 outline-none transition-colors text-gray-700 pr-12"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute right-3 sm:right-4 top-9 sm:top-10 text-gray-400 hover:text-gray-600 transition-colors"
          >
            {showPassword ? <EyeOff size={18} className="sm:w-5 sm:h-5" /> : <Eye size={18} className="sm:w-5 sm:h-5" />}
          </button>
        </div>

        <div className="flex justify-between items-center text-xs sm:text-sm">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 sm:w-5 sm:h-5 text-[#1B2744] border-2 border-gray-300 rounded focus:ring-0 accent-[#1B2744] cursor-pointer"
            />
            <span className="text-gray-600">Remember me</span>
          </label>
          <button type="button" className="text-gray-600 hover:text-[#1B2744] transition-colors font-medium">
            Forgot password?
          </button>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-[#1B2744] text-white py-3 sm:py-3.5 rounded-xl sm:rounded-2xl text-sm sm:text-base font-semibold flex items-center justify-center gap-2 hover:bg-[#131d33] transition-all disabled:opacity-70 disabled:cursor-not-allowed mt-6 sm:mt-8"
        >
          {isLoading ? (
            <span className="border-2 border-white/30 border-t-white rounded-full w-4 h-4 sm:w-5 sm:h-5 animate-spin"></span>
          ) : (
            <>
              Sign In <ArrowRight size={18} className="sm:w-5 sm:h-5" strokeWidth={2.5} />
            </>
          )}
        </button>

        <div className="mt-4 sm:mt-6 text-center text-xs sm:text-sm text-gray-600">
          Don't have an account?{' '}
          <button onClick={onSignUpClick} className="text-[#1B2744] font-semibold hover:underline">
            Sign Up
          </button>
        </div>
      </form>
    </div>
  )
}

function SignUpForm({ onSignUp, onBack }: SignUpFormProps) {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')

    if (!fullName.trim()) {
      setError('Full name is required')
      return
    }
    if (!email.endsWith(STUDENT_DOMAIN) && !email.endsWith(ADMIN_DOMAIN)) {
      setError(`Please use your university email (${STUDENT_DOMAIN} or ${ADMIN_DOMAIN})`)
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setIsLoading(true)
    try {
      await onSignUp(email, password, fullName)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign up failed'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl p-6 sm:p-8 md:p-12 w-full max-w-md">
      <div className="flex items-center gap-2 sm:gap-3 mb-8 sm:mb-12">
        <div className="w-12 h-12 sm:w-16 sm:h-16 bg-[#1B2744] rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6 sm:h-8 sm:w-8 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l9-5-9-5-9 5 9 5z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l6.16-3.422A12.083 12.083 0 0112 21a12.083 12.083 0 01-6.16-10.422L12 14z" />
          </svg>
        </div>
        <div>
          <h1 className="text-[#1B2744] text-base sm:text-xl font-bold font-serif leading-tight">TSU Career</h1>
          <p className="text-gray-400 text-xs sm:text-sm font-medium">Management System</p>
        </div>
      </div>

      <div className="mb-6 sm:mb-8">
        <h2 className="text-[#1B2744] text-2xl sm:text-3xl md:text-4xl font-bold mb-1 sm:mb-2 italic font-serif">Create Account</h2>
        <p className="text-gray-500 text-sm sm:text-base">Sign up to get started</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
        <div className="space-y-2">
          <label className="block text-xs sm:text-sm font-medium text-gray-800">Full Name</label>
          <input
            type="text"
            placeholder="Enter your full name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full rounded-xl sm:rounded-2xl border-2 border-gray-200 px-4 sm:px-5 py-3 sm:py-3.5 text-sm sm:text-base placeholder-gray-400 focus:border-[#1B2744] focus:ring-0 outline-none transition-colors text-gray-700"
            required
          />
        </div>

        <div className="space-y-2">
          <label className="block text-xs sm:text-sm font-medium text-gray-800">Email Address</label>
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl sm:rounded-2xl border-2 border-gray-200 px-4 sm:px-5 py-3 sm:py-3.5 text-sm sm:text-base placeholder-gray-400 focus:border-[#1B2744] focus:ring-0 outline-none transition-colors text-gray-700"
            required
          />
          {error && <p className="text-red-500 text-xs sm:text-sm">{error}</p>}
        </div>

        <div className="space-y-2 relative">
          <label className="block text-xs sm:text-sm font-medium text-gray-800">Password</label>
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl sm:rounded-2xl border-2 border-gray-200 px-4 sm:px-5 py-3 sm:py-3.5 text-sm sm:text-base placeholder-gray-400 focus:border-[#1B2744] focus:ring-0 outline-none transition-colors text-gray-700 pr-12"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute right-3 sm:right-4 top-9 sm:top-10 text-gray-400 hover:text-gray-600 transition-colors"
          >
            {showPassword ? <EyeOff size={18} className="sm:w-5 sm:h-5" /> : <Eye size={18} className="sm:w-5 sm:h-5" />}
          </button>
        </div>

        <div className="space-y-2 relative">
          <label className="block text-xs sm:text-sm font-medium text-gray-800">Confirm Password</label>
          <input
            type={showConfirmPassword ? 'text' : 'password'}
            placeholder="Confirm your password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full rounded-xl sm:rounded-2xl border-2 border-gray-200 px-4 sm:px-5 py-3 sm:py-3.5 text-sm sm:text-base placeholder-gray-400 focus:border-[#1B2744] focus:ring-0 outline-none transition-colors text-gray-700 pr-12"
            required
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword((prev) => !prev)}
            className="absolute right-3 sm:right-4 top-9 sm:top-10 text-gray-400 hover:text-gray-600 transition-colors"
          >
            {showConfirmPassword ? <EyeOff size={18} className="sm:w-5 sm:h-5" /> : <Eye size={18} className="sm:w-5 sm:h-5" />}
          </button>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-[#1B2744] text-white py-3 sm:py-3.5 rounded-xl sm:rounded-2xl text-sm sm:text-base font-semibold flex items-center justify-center gap-2 hover:bg-[#131d33] transition-all disabled:opacity-70 disabled:cursor-not-allowed mt-6 sm:mt-8"
        >
          {isLoading ? (
            <span className="border-2 border-white/30 border-t-white rounded-full w-4 h-4 sm:w-5 sm:h-5 animate-spin"></span>
          ) : (
            <>
              Create Account <ArrowRight size={18} className="sm:w-5 sm:h-5" strokeWidth={2.5} />
            </>
          )}
        </button>
      </form>

      <div className="mt-4 sm:mt-6 text-center text-xs sm:text-sm text-gray-600">
        Already have an account?{' '}
        <button onClick={onBack} className="text-[#1B2744] font-semibold hover:underline">
          Sign In
        </button>
      </div>
    </div>
  )
}

export default function Login() {
  const { user, signIn, signUp } = useAuth()
  const navigate = useNavigate()
  const [view, setView] = useState<View>('login')

  useEffect(() => {
    if (user) navigate('/')
  }, [user, navigate])

  const handleLogin = async (email: string, password: string) => {
    await signIn(email, password)
    const redirectPath = email.endsWith(ADMIN_DOMAIN) ? '/admin' : '/'
    navigate(redirectPath)
  }

  const handleSignUp = async (email: string, password: string, _fullName: string) => {
    await signUp(email, password)
    const redirectPath = email.endsWith(ADMIN_DOMAIN) ? '/admin' : '/'
    navigate(redirectPath)
  }

  return (
    <div className="h-screen bg-white px-3 sm:px-4 flex items-center justify-center overflow-hidden">
      {view === 'login' ? (
        <LoginForm
          onLogin={handleLogin}
          onSignUpClick={() => setView('signup')}
        />
      ) : (
        <SignUpForm
          onSignUp={handleSignUp}
          onBack={() => setView('login')}
        />
      )}

      <div className="hidden">
        {/* Toggle buttons for future use if needed */}
        <button onClick={() => setView('login')}>Login</button>
        <button onClick={() => setView('signup')}>Signup</button>
      </div>
    </div>
  )
}
