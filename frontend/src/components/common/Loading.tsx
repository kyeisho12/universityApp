import React from 'react'

const Loading = () => {
  return (
    <div className="flex items-center justify-center gap-3 py-6 text-neutral-700">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-neutral-200 border-t-indigo-600" aria-hidden="true" />
      <span className="text-sm font-medium">Loading...</span>
    </div>
  )
}

export default Loading
