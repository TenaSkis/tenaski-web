'use client'

import Link from 'next/link'
import { useHeroAutoFit } from '@/hooks/useHeroAutoFit'

type HeroButton = {
  text: string
  href: string
  variant: 'primary' | 'secondary'
}

type HeroProps = {
  eyebrow: string
  title: string
  description: string
  imageUrl?: string
  buttons?: HeroButton[]  // Botones opcionales y configurables
  /**
   * Solo para la vista previa del panel de administración: en lugar de
   * medir una pantalla, el Hero se ajusta a la altura de su contenedor.
   * El resto del comportamiento (padding y auto-ajuste) es idéntico, así
   * que lo que se ve en la vista previa es lo que se ve en la web.
   */
  preview?: boolean
}

export default function Hero({
  eyebrow,
  title,
  description,
  imageUrl,
  buttons,
  preview = false,
}: HeroProps) {
  // Firma del contenido: si cambian los textos, vuelve a medir.
  const contentKey = [
    eyebrow,
    title,
    description,
    buttons?.map((b) => b.text).join('|') ?? '',
  ].join('§')

  const { frameRef, contentRef } = useHeroAutoFit(contentKey)

  return (
    // `min-h-screen h-svh`: la altura queda FIJA a una pantalla. El
    // `min-h-screen` sigue estando detrás como fallback (y, si el JS no
    // llegara a ejecutarse, el `min-height` gana al `height` y la sección
    // vuelve a crecer como antes en vez de recortar el texto).
    <section
      className={
        preview
          ? 'home-section relative h-full overflow-hidden'
          : 'home-section relative min-h-screen h-svh overflow-hidden'
      }
    >

      {/* ── FONDO ─────────────────────────────────────────── */}
      <div className="absolute inset-0 overflow-hidden">

        {/* 1. Imagen principal del Hero + Su propia transición inferior + Opacidad */}
        {imageUrl ? (
          <div
            className="h-full w-full bg-cover bg-center"
            style={{ 
              backgroundImage: `url(${imageUrl})`,
              opacity: 0.55, // <-- Aquí le damos el toque justo de opacidad para que trasluzca la madera
               
              // Creamos un fundido suave: arriba 100% visible, abajo se desvanece por completo
              maskImage: 'linear-gradient(to bottom, black 60%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to bottom, black 60%, transparent 100%)'
            }}
          />
        ) : (
          <div className="h-full w-full bg-[var(--surface-soft)]" />
        )}

        {/* 2. Filtro oscuro sutil sobre TODO el Hero para la legibilidad del texto,
            reajustado para que acompañe bien a la opacidad de la imagen */}
        <div 
          className="absolute inset-0 pointer-events-none bg-gradient-to-t from-transparent via-[rgba(0,0,0,0.3)] to-[rgba(0,0,0,0.55)]" 
        />

      </div>

      {/* ── CONTENIDO ─────────────────────────────────────── */}
      {/* El `pt-28` (112px) reserva los 89px que ocupa el navbar sin
          scrollear, más el aire justo para que el eyebrow nunca quede
          por debajo de la barra. */}
      <div
        ref={frameRef}
        className="absolute inset-0 z-10 flex flex-col justify-end px-6 pb-30 pt-28 md:pb-24"
      >

        <div ref={contentRef} className="hero-fit mx-auto w-full max-w-6xl">

          {/* Eyebrow en dorado */}
          <p className="hero-section__eyebrow">
            {eyebrow}
          </p>

          {/* Título hero: escala con breakpoints y baja de peldaño si no cabe */}
          <h1 className="hero-section__title">
            {title}
          </h1>

          {/* Descripción */}
          <p className="hero-section__description">
            {description}
          </p>

          {/* ── BOTONES ─────────────────────────────────────── */}
          {/* Solo se renderizan si se pasan botones */}
          {buttons && buttons.length > 0 && (
            <div className="hero-section__actions">

              {buttons.map((button) => (
                <Link
                  key={button.href}
                  href={button.href}
                  className={`hero-section__button ${
                    button.variant === 'primary'
                      ? 'hero-section__button--primary'
                      : 'hero-section__button--secondary'
                  }`}
                >
                  {button.text}
                </Link>
              ))}

            </div>
          )}

        </div>
      </div>
    </section>
  )
}