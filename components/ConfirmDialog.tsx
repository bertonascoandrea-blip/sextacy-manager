'use client'

interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Conferma',
  cancelLabel = 'Annulla',
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 px-4 pb-4 sm:pb-0">
      <div className="w-full max-w-sm bg-slate-800 rounded-2xl border border-slate-700 p-6 shadow-xl">
        <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
        <p className="text-slate-300 text-sm mb-6">{message}</p>
        <div className="flex flex-col gap-3">
          <button
            onClick={onConfirm}
            className={`w-full py-3 rounded-xl font-semibold text-white ${
              danger
                ? 'bg-red-600 active:bg-red-700'
                : 'bg-green-700 active:bg-green-800'
            }`}
          >
            {confirmLabel}
          </button>
          <button
            onClick={onCancel}
            className="w-full py-3 rounded-xl font-semibold text-slate-300 bg-slate-700 active:bg-slate-600"
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
