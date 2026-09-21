import { createPortal } from 'react-dom'

type ConfirmModalProps = {
  title?: string
  message: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

function ConfirmModal({
  title = 'Are you sure?',
  message,
  confirmLabel = 'Delete',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return createPortal(
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-20"
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="border-3 bg-white p-30 flex flex-col gap-20 main-btn"
      >
        <h2 className="text-20 font-title font-bold uppercase">{title}</h2>
        <p className="text-16 font-title">{message}</p>

        <div className="flex gap-10 justify-end">
          <button type="button" onClick={onCancel} className="main-btn font-title font-bold px-15 py-10">
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="main-btn font-title font-bold bg-main-red text-white px-15 py-10"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

export default ConfirmModal
