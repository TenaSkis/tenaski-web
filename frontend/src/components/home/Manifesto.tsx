'use client'

import Image from 'next/image'
import SectionTitle from '@/components/ui/SectionTitle'
import SectionText from '../ui/SectionTest'

type ManifestoProps = {
eyebrow: string    // Etiqueta superior (ej: "Nuestra filosofía")
title: string      // Título de la sección
description: string
imageUrl?: string  // Imagen lateral opcional
}

export default function Manifesto({ eyebrow, title, description, imageUrl }: ManifestoProps) {
return (

<section className="home-section py-10">

  {/* Grid de 2 columnas en desktop: texto | imagen */}
  <div className="mx-auto grid max-w-6xl items-center gap-20 px-6 lg:grid-cols-2">

    {/* ── TEXTO ─────────────────────────────────────────── */}
    <div>

      {/* Eyebrow en dorado */}
      <p className="home-section__eyebrow">
        {eyebrow}
      </p>

      {/* Título con el componente compartido (max-w-2xl incluido) */}
      <SectionTitle>{title}</SectionTitle>

      {/* Descripción con el componente compartido (max-w-lg incluido) */}
      <div className="mt-10">
        <SectionText>{description}</SectionText>
      </div>

    </div>

    {/* ── IMAGEN ────────────────────────────────────────── */}
    {/* group permite que los hijos reaccionen al hover del contenedor */}
    <div className="relative h-[520px] overflow-hidden group">

      {/* Imagen o placeholder */}
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt=""
          fill
          sizes="(min-width: 1152px) 512px, (min-width: 1024px) calc(50vw - 64px), calc(100vw - 48px)"
          className="img-premium object-cover"
        />
      ) : (
        <div className="home-section__image-placeholder flex h-full items-center justify-center">
          <p
            className="text-xs uppercase tracking-[0.3em]"
            style={{ color: 'var(--placeholder)' }}
          >
            Imagen manifiesto
          </p>
        </div>
      )}

      {/* Overlay oscuro que desaparece en hover para revelar la imagen */}
      <div
        className="absolute inset-0 transition-opacity duration-700 group-hover:opacity-0"
        style={{ backgroundColor: 'var(--overlay-medium)' }}
      />

    </div>

  </div>

</section>

)
}