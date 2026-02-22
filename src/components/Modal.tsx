import React, { useId } from 'react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  message: string
  type?: 'success' | 'error' | 'info'
  showCancelButton?: boolean
  onConfirm?: () => void
  confirmText?: string
  cancelText?: string
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  message,
  type = 'info',
  showCancelButton = false,
  onConfirm,
  confirmText = 'Aceptar',
  cancelText = 'Cancelar'
}) => {
  const titleId = useId()
  const descriptionId = useId()

  if (!isOpen) return null

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm()
    }
    onClose()
  }

  const getIconByType = () => {
    const baseIconClasses = 'flex h-10 w-10 items-center justify-center rounded-full'

    switch (type) {
      case 'success':
        return (
          <div className={`${baseIconClasses} bg-green-100 text-green-600`}>
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="20,6 9,17 4,12" />
            </svg>
          </div>
        )
      case 'error':
        return (
          <div className={`${baseIconClasses} bg-red-100 text-red-600`}>
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>
        )
      default:
        return (
          <div className={`${baseIconClasses} bg-blue-100 text-blue-600`}>
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v6" />
              <path d="M12 16h.01" />
            </svg>
          </div>
        )
    }
  }

  const accentColor =
    type === 'error' ? 'bg-red-500' : type === 'success' ? 'bg-green-500' : 'bg-blue-500'

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={handleOverlayClick}
    >
      <div
        aria-describedby={descriptionId}
        aria-labelledby={titleId}
        aria-modal="true"
        className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 transition-all duration-300"
        role="dialog"
      >
        {/* Accent bar */}
        <div className={`h-1.5 ${accentColor}`} />

        {/* Header */}
        <div className="flex items-start gap-4 px-6 pt-6 pb-2">
          {getIconByType()}
          <h3 className="flex-1 text-lg font-bold text-gray-900 pt-1.5" id={titleId}>
            {title}
          </h3>
          <button
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            onClick={onClose}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4">
          <p className="text-sm leading-relaxed text-gray-600" id={descriptionId}>
            {message}
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col-reverse gap-2 px-6 pb-6 pt-2 sm:flex-row sm:justify-end">
          {showCancelButton && (
            <button
              className="w-full rounded-lg border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200 sm:w-auto"
              onClick={onClose}
            >
              {cancelText}
            </button>
          )}
          <button
            className={`w-full rounded-lg px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 sm:w-auto ${type === 'error'
                ? 'bg-red-600 hover:bg-red-700 focus:ring-red-300'
                : type === 'success'
                  ? 'bg-green-600 hover:bg-green-700 focus:ring-green-300'
                  : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-300'
              }`}
            onClick={handleConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}

export default Modal
