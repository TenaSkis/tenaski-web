'use client'

import { useState, useCallback, useRef, type TouchEvent } from 'react'

type GalleryImage = {
  url: string
  alt: string
  principal: boolean
}

type Props = {
  images: GalleryImage[]
  nombre: string
}

// Píxeles que debe recorrer el dedo para que cuente como swipe
const SWIPE_THRESHOLD = 50

export default function ProductGallery({ images, nombre }: Props) {
  const [activeIndex, setActiveIndex] = useState(0)

  const prev = useCallback(() => {
    setActiveIndex((i) => (i === 0 ? images.length - 1 : i - 1))
  }, [images.length])

  const next = useCallback(() => {
    setActiveIndex((i) => (i === images.length - 1 ? 0 : i + 1))
  }, [images.length])

  // ── Gesto de swipe ────────────────────────────────
  // touchStart es un ref y no estado: guarda coordenadas, nunca se pinta,
  // y así no re-renderiza en cada touchmove. dragX sí es estado porque
  // la imagen tiene que moverse de verdad con el dedo.
  const [dragX, setDragX] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const touchStart = useRef<{ x: number; y: number } | null>(null)

  const onTouchStart = useCallback(
    (e: TouchEvent<HTMLDivElement>) => {
      if (images.length < 2) return
      touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
      setIsDragging(true)
      setDragX(0)
    },
    [images.length]
  )

  const onTouchMove = useCallback((e: TouchEvent<HTMLDivElement>) => {
    if (!touchStart.current) return

    const dx = e.touches[0].clientX - touchStart.current.x
    const dy = e.touches[0].clientY - touchStart.current.y

    // Gesto más vertical que horizontal = scroll de página. El null en
    // touchStart es la señal de "abandono", y corta también el touchend.
    if (Math.abs(dy) > Math.abs(dx)) {
      touchStart.current = null
      setIsDragging(false)
      setDragX(0)
      return
    }

    setDragX(dx)
  }, [])

  const onTouchEnd = useCallback(() => {
    if (!touchStart.current) return
    touchStart.current = null
    setIsDragging(false)

    if (dragX <= -SWIPE_THRESHOLD) next()
    else if (dragX >= SWIPE_THRESHOLD) prev()

    setDragX(0)
  }, [dragX, next, prev])

  if (images.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#141414]">
        <p className="text-white/20 text-sm tracking-widest uppercase text-xs">
          Sin imágenes
        </p>
      </div>
    )
  }

  const active = images[activeIndex]
  const hasMultiple = images.length > 1

  return (
    <div className="relative w-full h-full flex flex-col bg-[#141414]">

      {/* ── Imagen activa ──────────────────────────────── */}
      <div
        className="flex-1 relative overflow-hidden touch-pan-y"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
      >
        <img
          key={activeIndex}
          src={active.url}
          alt={active.alt}
          className={`
            w-full h-full object-cover select-none pointer-events-none
            ${isDragging ? '' : 'transition-transform duration-300 ease-out'}
          `}
          style={{ transform: `translateX(${dragX}px)` }}
        />

        {/* Flechas de navegación — solo si hay más de una imagen */}
        {hasMultiple && (
          <>
            {/* Flecha izquierda */}
            <button
              onClick={prev}
              aria-label="Imagen anterior"
              className="
                absolute left-4 top-1/2 -translate-y-1/2
                w-10 h-10 flex items-center justify-center
                bg-[var(--overlay-medium)] backdrop-blur-sm
                text-[var(--text-muted)] hover:text-[var(--foreground)]
                border border-[var(--border)] hover:border-[var(--border-hover)]
                transition-all duration-200
              "
            >
              ←
            </button>

            {/* Flecha derecha */}
            <button
              onClick={next}
              aria-label="Imagen siguiente"
              className="
                absolute right-4 top-1/2 -translate-y-1/2
                w-10 h-10 flex items-center justify-center
                bg-[#0F0F0F]/60 backdrop-blur-sm
                text-white/70 hover:text-white
                border border-white/10 hover:border-white/30
                transition-all duration-200
              "
            >
              →
            </button>

            {/* Indicadores de puntos */}
            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-2">
              {images.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveIndex(i)}
                  aria-label={`Ir a imagen ${i + 1}`}
                  className={`
                    transition-all duration-300
                    ${i === activeIndex
                      ? 'w-6 h-1.5 bg-[var(--accent)]'
                      : 'w-1.5 h-1.5 bg-[var(--text-soft)] hover:bg-[var(--text-muted)]'
                    }
                  `}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Miniaturas — solo mobile, debajo de la imagen ─ */}
      {hasMultiple && (
        <div className="shrink-0 lg:hidden flex gap-1.5 p-3 bg-[var(--background)] overflow-x-auto">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => setActiveIndex(i)}
              className={`
                shrink-0 w-14 h-14 overflow-hidden transition
                ${i === activeIndex
                ? 'ring-2 ring-[var(--accent)] ring-offset-1 ring-offset-[var(--background)]'
                : 'opacity-40 hover:opacity-70'
                }
              `}
              aria-label={`Ver imagen ${i + 1}`}
            >
              <img
                src={img.url}
                alt={img.alt}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}

    </div>
  )
}