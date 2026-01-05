import React from 'react'

export type ModalProps = {
  open: boolean
  title?: string
  onClose: () => void
  children: React.ReactNode
}

const Modal = ({ open, title, onClose, children }: ModalProps) => {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        {title ? <h3 className="text-lg font-semibold text-neutral-900">{title}</h3> : null}
        <div className="mt-3 text-sm text-neutral-700">{children}</div>
        <div className="mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-xl bg-neutral-100 px-4 py-2 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

export default Modal
