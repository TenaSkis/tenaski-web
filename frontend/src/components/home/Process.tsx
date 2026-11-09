'use client'

import Image from 'next/image'
import SectionText from "../ui/SectionTest"

// Tipo para cada paso individual del proceso
type Step = {
  title: string
  description: string
  imageUrl?: string  // Imagen del paso, opcional
  imageAlt?: string
}

type ProcessProps = {
  eyebrow: string     // Etiqueta superior (ej: "Cómo lo hacemos")
  title: string       // Título de la sección
  description: string // Descripción introductoria
  steps: Step[]       // Array de pasos del proceso
}

export default function Process({ eyebrow, title, description, steps }: ProcessProps) {
  return (
    <section className="home-section py-20">
      <div className="mx-auto max-w-6xl px-6">

        {/* ── HEADER ────────────────────────────────────────── */}
        {/* max-w-3xl para que el header no ocupe todo el ancho */}
        <div className="max-w-3xl">

          {/* Eyebrow en dorado */}
          <p className="home-section__eyebrow">
            {eyebrow}
          </p>

          {/* Título inline (sin SectionTitle) para respetar el max-w-3xl del contenedor */}
          <h2 className="home-section__title">
            {title}
          </h2>

          {/* Descripción con el componente compartido */}
          <div className="mt-10">
            <SectionText>{description}</SectionText>
          </div>

        </div>

        {/* ── STEPS ─────────────────────────────────────────── */}
        <div className="mt-24 space-y-28">

          {steps.map((step, index) => {

            // Los pasos pares alternan el orden imagen/texto para dar ritmo visual
            const isEven = index % 2 === 1

            return (
              <div key={step.title} className="grid items-center gap-12 lg:grid-cols-2">

                {/* ── IMAGEN DEL PASO ───────────────────────── */}
                {/* lg:order-X controla si la imagen va a izquierda o derecha */}
                <div className={`relative h-[420px] overflow-hidden group ${isEven ? 'lg:order-2' : 'lg:order-1'}`}>

                  {/* Imagen o placeholder si no hay */}
                  {step.imageUrl ? (
                    <Image
                      src={step.imageUrl}
                      alt={step.imageAlt ?? step.title}
                      fill
                      sizes="(min-width: 1152px) 528px, (min-width: 1024px) calc(50vw - 48px), calc(100vw - 48px)"
                      loading="lazy"
                      className="img-premium object-cover object-center transition-all duration-700 group-hover:scale-110 group-hover:brightness-110 group-hover:contrast-110"
                    />
                  ) : (
                    <div className="home-section__image-placeholder flex h-full items-center justify-center">
                      <p className="text-xs uppercase tracking-[0.3em] text-[#E8E4DC]/20">Imagen</p>
                    </div>
                  )}

                  {/* Overlay oscuro que desaparece en hover */}
                  <div className="absolute inset-0 bg-[var(--overlay-light)] transition-opacity duration-700 group-hover:opacity-0" />

                  {/* Gradiente inferior para fundir con el fondo */}
                  <div className="absolute inset-0 bg-[image:var(--gradient-dark)]" />

                </div>

                {/* ── TEXTO DEL PASO ────────────────────────── */}
                <div className={isEven ? 'lg:order-1' : 'lg:order-2'}>

                  {/* Número del paso en dorado apagado */}
                  <p className="home-section__step-number">
                    0{index + 1}
                  </p>

                  {/* Título del paso, más pequeño que el título de sección */}
                  <h3 className="home-section__step-title">
                    {step.title}
                  </h3>

                  {/* Descripción del paso, inline (no usa SectionText para no limitar el ancho) */}
                  <p className="mt-6 home-section__text">
                    {step.description}
                  </p>

                </div>

              </div>
            )
          })}

        </div>

      </div>
    </section>
  )
}