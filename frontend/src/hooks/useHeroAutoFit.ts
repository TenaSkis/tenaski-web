'use client'

// hooks/useHeroAutoFit.ts
//
// El Hero tiene altura FIJA (una pantalla). Como el texto llega desde el
// panel de administración sin ningún tipo de recorte, un texto largo se
// salía de la sección y quedaba por debajo del navbar.
//
// Aquí reducimos el TÍTULO por peldaños hasta que el bloque entra en el
// espacio libre que queda entre el navbar y el borde inferior.
//
// Importante: solo el título cambia de tamaño. El eyebrow, la descripción
// y los botones conservan siempre el suyo — si encogieran también, el Hero
// entero quedaba en miniatura y la jerarquía contra el navbar se rompía.

import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Escalera de reducción del título, de mayor a menor.
 * Saltos finos (~8% entre peldaños) para que el cambio se perciba como una
 * progresión suave y no como un brusco salto de tamaño.
 * Sobre la base de 96px (lg) baja hasta 43px.
 */
export const HERO_FIT_STEPS = [
  1, 0.92, 0.85, 0.78, 0.72, 0.66, 0.6, 0.55, 0.5, 0.45,
] as const

const MIN_STEP = HERO_FIT_STEPS.length - 1

/**
 * Niveles de recorte de emergencia.
 * 'none'  → el texto cabe con el peldaño elegido.
 * 'title' → ni en el peldaño más bajo cabe el título: se recorta con "…".
 * 'both'  → tampoco cabe así: se recorta además la descripción.
 */
export type HeroClamp = 'none' | 'title' | 'both'

type HeroFit = {
  step: number
  clamp: HeroClamp
}

/**
 * @param contentKey Firma del contenido renderizado dentro del Hero. Basta
 *   con que cambie cuando el texto cambia; se usa para volver a medir sin
 *   depender de la identidad de los objetos.
 */
export function useHeroAutoFit(contentKey: string) {
  // El `frame` es la caja con el alto disponible (la que lleva los paddings).
  const frameRef = useRef<HTMLDivElement | null>(null)
  // El `content` es el bloque de texto que hay que encoger.
  const contentRef = useRef<HTMLDivElement | null>(null)

  const [fit, setFit] = useState<HeroFit>({ step: 0, clamp: 'none' })

  const fitToSpace = useCallback(() => {
    const frame = frameRef.current
    const content = contentRef.current
    if (!frame || !content) return

    const styles = window.getComputedStyle(frame)
    const paddingTop = parseFloat(styles.paddingTop) || 0
    const paddingBottom = parseFloat(styles.paddingBottom) || 0
    const available = frame.clientHeight - paddingTop - paddingBottom

    // Sin espacio medible (contenedor oculto, por ejemplo) no tocamos nada.
    if (available <= 0) return

    const fits = () => content.getBoundingClientRect().height <= available

    // Escribimos la variable a mano porque necesitamos MEDIR cada valor:
    // hacerlo con estado provocaría un render por iteración.
    const apply = (scale: number, clamp: HeroClamp) => {
      content.style.setProperty('--hero-fit', String(scale))
      content.dataset.heroClamp = clamp
    }

    // ── 1. Buscamos el peldaño más alto que cabe, sin recortar nada.
    let chosen: (typeof HERO_FIT_STEPS)[number] = HERO_FIT_STEPS[0]
    let clamp: HeroClamp = 'none'
    let resolved = false

    for (const scale of HERO_FIT_STEPS) {
      apply(scale, 'none')
      if (fits()) {
        chosen = scale
        resolved = true
        break
      }
    }

    // ── 2. Ni en el peldaño más bajo cabe: recortamos el título con "…" y
    //       volvemos a medir (a veces con solo esto ya cabe).
    if (!resolved) {
      chosen = HERO_FIT_STEPS[MIN_STEP]
      apply(chosen, 'title')
      clamp = fits() ? 'title' : 'both'
    }

    // ── 3. Último recurso: se recorta también la descripción. Con esto el
    //       Hero ya no puede desbordarse en ningún caso.
    apply(chosen, clamp)

    const step = HERO_FIT_STEPS.indexOf(chosen)

    setFit((prev) =>
      prev.step === step && prev.clamp === clamp ? prev : { step, clamp }
    )
  }, [])

  useEffect(() => {
    const content = contentRef.current
    if (!content) return

    let raf = 0
    const schedule = () => {
      window.cancelAnimationFrame(raf)
      raf = window.requestAnimationFrame(fitToSpace)
    }

    schedule()

    // Re-ajustamos en cuanto cambia el tamaño de la caja: resize de
    // ventana, giro del móvil o barra de direcciones al hacer scroll.
    const observer = new ResizeObserver(schedule)
    if (frameRef.current) observer.observe(frameRef.current)

    return () => {
      window.cancelAnimationFrame(raf)
      observer.disconnect()
    }
  }, [contentKey, fitToSpace])

  return {
    frameRef,
    contentRef,
    step: fit.step,
    scale: HERO_FIT_STEPS[fit.step],
    clamp: fit.clamp,
  }
}