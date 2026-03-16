import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Eye, EyeOff } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)

  // Supabase sends the recovery token via URL hash — listen for the session event
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setSessionReady(true)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')

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
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) throw new Error(updateError.message)
      setDone(true)
      setTimeout(() => navigate('/login'), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="h-screen bg-white px-3 sm:px-4 flex items-center justify-center overflow-hidden">
      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl p-6 sm:p-8 md:p-12 w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center gap-2 sm:gap-3 mb-8 sm:mb-12">
          <div className="w-12 h-12 sm:w-16 sm:h-16 bg-[#1B2744] rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 sm:h-8 sm:w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
          <h2 className="text-[#1B2744] text-2xl sm:text-3xl md:text-4xl font-bold mb-1 sm:mb-2 italic font-serif">New Password</h2>
          <p className="text-gray-500 text-sm sm:text-base">Enter and confirm your new password below</p>
        </div>

        {done ? (
          <div className="space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-green-700 text-sm">
              ✅ Password updated successfully! Redirecting to sign in...
            </div>
          </div>
        ) : !sessionReady ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-yellow-700 text-sm">
            ⏳ Verifying reset link... If this takes too long, please request a new password reset.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            <div className="space-y-2 relative">
              <label className="block text-xs sm:text-sm font-medium text-gray-800">New Password</label>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter new password"
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
              <label className="block text-xs sm:text-sm font-medium text-gray-800">Confirm New Password</label>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Confirm new password"
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

            {error && <p className="text-red-500 text-xs sm:text-sm">{error}</p>}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#1B2744] text-white py-3 sm:py-3.5 rounded-xl sm:rounded-2xl text-sm sm:text-base font-semibold flex items-center justify-center gap-2 hover:bg-[#131d33] transition-all disabled:opacity-70 disabled:cursor-not-allowed mt-6 sm:mt-8"
            >
              {isLoading ? (
                <span className="border-2 border-white/30 border-t-white rounded-full w-4 h-4 sm:w-5 sm:h-5 animate-spin"></span>
              ) : (
                <>Set New Password <ArrowRight size={18} className="sm:w-5 sm:h-5" strokeWidth={2.5} /></>
              )}
            </button>

            <div className="mt-4 sm:mt-6 text-center text-xs sm:text-sm text-gray-600">
              Remember your password?{' '}
              <button type="button" onClick={() => navigate('/login')} className="text-[#1B2744] font-semibold hover:underline">
                Sign In
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
