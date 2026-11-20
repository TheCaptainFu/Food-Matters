import { useEffect } from 'react'
import { createPortal } from 'react-dom'

export type ToastData = {
  // Bumped per toast so a new message restarts the auto-hide timer even if
  // its text is identical to the previous one.
  id: number
  message: string
  tone?: 'info' | 'error'
  action?: { label: string; onClick: () => void }
  // Omit to keep it on screen until dismissed (for messages worth reading).
  autoHideMs?: number
}

type ToastProps = {
  toast: ToastData
  onClose: () => void
}

// An in-app message at the bottom of the screen — replaces the browser's
// window.alert, which looks like an error dialog and blocks the page.
function Toast({ toast, onClose }: ToastProps) {
  useEffect(() => {
    if (!toast.autoHideMs) return
    const timer = window.setTimeout(onClose, toast.autoHideMs)
    return () => window.clearTimeout(timer)
  }, [toast.id, toast.autoHideMs, onClose])

  return createPortal(
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-40px)] max-w-[480px]">
      <div
        role="status"
        className={
          toast.tone === 'error'
            ? 'bg-white border-3 border-main-red shadow-[4px_4px_0_0_#000] p-15 flex items-start gap-15'
            : 'bg-white border-3 border-black shadow-[4px_4px_0_0_#000] p-15 flex items-start gap-15'
        }
      >
        <p className="flex-1 text-14 font-title whitespace-pre-line">{toast.message}</p>
        {toast.action && (
          <button
            type="button"
            onClick={() => {
              toast.action!.onClick()
              onClose()
            }}
            className="font-title font-bold text-14 text-main-blue underline cursor-pointer shrink-0"
          >
            {toast.action.label}
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          aria-label="Dismiss"
          className="font-bold text-14 leading-none hover:text-main-red cursor-pointer shrink-0"
        >
          ✕
        </button>
      </div>
    </div>,
    document.body,
  )
}

export default Toast
