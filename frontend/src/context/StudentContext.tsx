import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { useAuthContext } from './AuthContext'
import { getStudentProfile, upsertStudentProfile } from '../services/studentService'

type StudentProfile = Record<string, unknown> | null

type StudentContextValue = {
  profile: StudentProfile
  profileError: unknown
  isProfileLoading: boolean
  isProfileComplete: boolean
  refreshProfile: () => Promise<StudentProfile>
  saveProfile: (updates: Record<string, unknown>) => Promise<{ data: StudentProfile; error: unknown }>
}

const StudentContext = createContext<StudentContextValue | undefined>(undefined)

function isProfileComplete(profile: StudentProfile) {
  const requiredFields = ['full_name', 'university', 'major', 'graduation_year']
  return requiredFields.every((field) => {
    const value = (profile as Record<string, unknown> | null)?.[field]
    if (value === null || value === undefined) return false
    if (typeof value === 'string') return value.trim().length > 0
    return true
  })
}

export function StudentProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuthContext()
  const [profile, setProfile] = useState<StudentProfile>(null)
  const [isProfileLoading, setIsProfileLoading] = useState(false)
  const [profileError, setProfileError] = useState<unknown>(null)

  useEffect(() => {
    let isMounted = true
    if (!user) {
      setProfile(null)
      setProfileError(null)
      setIsProfileLoading(false)
      return
    }

    setIsProfileLoading(true)
    getStudentProfile(user.id)
      .then(({ data, error }) => {
        if (!isMounted) return
        setProfileError(error ?? null)
        setProfile(data ?? null)
      })
      .finally(() => {
        if (isMounted) setIsProfileLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [user])

  async function refreshProfile() {
    if (!user) return null
    setIsProfileLoading(true)
    const { data, error } = await getStudentProfile(user.id)
    setProfileError(error ?? null)
    setProfile(data ?? null)
    setIsProfileLoading(false)
    return data ?? null
  }

  async function saveProfile(updates: Record<string, unknown>) {
    if (!user) throw new Error('No authenticated user')
    setIsProfileLoading(true)
    const payload = {
      id: user.id,
      email: user.email,
      ...updates,
    }
    const { data, error } = await upsertStudentProfile(payload)
    setProfileError(error ?? null)
    if (!error) setProfile((data as StudentProfile) ?? payload)
    setIsProfileLoading(false)
    return { data: (data as StudentProfile) ?? null, error }
  }

  const value = useMemo(
    () => ({
      profile,
      profileError,
      isProfileLoading,
      isProfileComplete: isProfileComplete(profile),
      refreshProfile,
      saveProfile,
    }),
    [profile, profileError, isProfileLoading]
  )

  return <StudentContext.Provider value={value}>{children}</StudentContext.Provider>
}

export function useStudent() {
  const ctx = useContext(StudentContext)
  if (!ctx) {
    throw new Error('useStudent must be used within StudentProvider')
  }
  return ctx
}
