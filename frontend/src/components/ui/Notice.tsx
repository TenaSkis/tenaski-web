'use client'

type NoticeProps = {
  message: string
  title?: string
  onClose?: () => void
  className?: string
}

/**
 * Aviso inline reutilizable. Sigue el estilo de los mensajes de error
 * existentes en el panel (borde y fondo rojo oscuro, texto rojo claro).
 */
export default function Notice({
  message,
  title,
  onClose,
  className = '',
}: NoticeProps) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`flex items-start gap-3 rounded-lg border border-red-900 bg-red-950 px-4 py-3 text-sm text-red-300 ${className}`}
    >
      <span
        aria-hidden="true"
        className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-red-800 text-[11px] font-bold text-red-400"
      >
        !
      </span>

      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold text-red-200">{title}</p>}
        <p className={title ? 'mt-1 leading-relaxed' : 'leading-relaxed'}>
          {message}
        </p>
      </div>

      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar aviso"
          className="-mr-1 -mt-1 shrink-0 rounded-md p-1 text-red-300/70 transition hover:bg-red-900/50 hover:text-red-200"
        >
          ✕
        </button>
      )}
    </div>
  )
}
