'use client'

import Image from 'next/image'
import Link from 'next/link'
import SectionTitle from '@/components/ui/SectionTitle'
import SectionText from '../ui/SectionTest'

type FeaturedProductProps = {
  eyebrow: string       // Etiqueta superior (ej: "Modelo destacado")
  name: string          // Nombre del producto, actúa como título
  description: string
  imageUrl?: string     // Imagen del producto opcional
  buttonText?: string   // Texto del CTA, por defecto "Descubrir modelo"
  buttonHref?: string   // Destino del CTA, por defecto "/catalogo"
}

export default function FeaturedProduct({
  eyebrow,
  name,
  description,
  imageUrl,
  buttonText = 'Descubrir modelo',
  buttonHref = '/catalogo',
}: FeaturedProductProps) {
  return (
    <section className="home-section py-10">
      <div className="mx-auto max-w-6xl px-6">

        {/* ── EYEBROW ───────────────────────────────────────── */}
        <div className="max-w-3xl">
          <p className="home-section__eyebrow">
            {eyebrow}
          </p>
        </div>

        {/* ── GRID PRODUCTO ─────────────────────────────────── */}
        {/* imagen a la izquierda, contenido a la derecha en desktop */}
        <div className="mt-10 grid gap-16 lg:grid-cols-2 items-center">

          {/* ── IMAGEN ──────────────────────────────────────── */}
          <div className="relative h-[520px] overflow-hidden group">

            {/* Imagen o placeholder */}
            {imageUrl ? (
              <Image
                src={imageUrl}
                alt=""
                fill
                sizes="(min-width: 1152px) 512px, (min-width: 1024px) calc(50vw - 64px), calc(100vw - 48px)"
                className="img-premium object-cover transition-all duration-700 group-hover:scale-[1.08]"
              />
            ) : (
              <div className="home-section__image-placeholder flex h-full items-center justify-center">
                <p className="text-xs uppercase tracking-[0.3em] text-[#E8E4DC]/20">
                  Imagen producto
                </p>
              </div>
            )}

            {/* Overlay oscuro que desaparece en hover */}
            <div className="absolute inset-0 bg-[var(--overlay-light)] transition-opacity duration-700 group-hover:opacity-0" />

            {/* Gradiente inferior para fundir con el fondo */}
            <div className="absolute inset-0 bg-[image:var(--gradient-dark)]" />

          </div>

          {/* ── CONTENIDO ───────────────────────────────────── */}
          <div>

            {/* Nombre del producto como título de sección */}
            <SectionTitle>{name}</SectionTitle>

            {/* Descripción con el componente compartido */}
            <div className="mt-10">
              <SectionText>{description}</SectionText>
            </div>

            {/* Botón secundario con borde sutil y efecto hover */}
            <Link href={buttonHref} className="mt-12 home-section__button-secondary">
              {buttonText}
            </Link>

          </div>

        </div>

      </div>
    </section>
  )
}