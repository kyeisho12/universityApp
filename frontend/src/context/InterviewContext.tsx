import React, { createContext, useContext, useMemo } from 'react'

type InterviewContextValue = Record<string, unknown>

const InterviewContext = createContext<InterviewContextValue | undefined>(undefined)

export function InterviewProvider({ children }: { children: React.ReactNode }) {
  const value = useMemo(() => ({} as InterviewContextValue), [])
  return <InterviewContext.Provider value={value}>{children}</InterviewContext.Provider>
}

export function useInterviewContext() {
  const ctx = useContext(InterviewContext)
  if (!ctx) {
    throw new Error('useInterviewContext must be used within InterviewProvider')
  }
  return ctx
}
