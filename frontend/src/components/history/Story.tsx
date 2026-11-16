'use client'

import Image from 'next/image'
import SectionTitle from '@/components/ui/SectionTitle'
import SectionText from '../ui/SectionTest'

type StoryProps = {
  eyebrow: string
  title: string
  description: string
  imageUrl?: string
}

export default function Story({
  eyebrow,
  title,
  description,
  imageUrl,
}: StoryProps) {
  return (
    <section className="home-section py-20">

      <div className="mx-auto grid max-w-6xl items-center gap-20 px-6 lg:grid-cols-2">

        {/* TEXTO */}
        <div>

          <p className="home-section__eyebrow">
            {eyebrow}
          </p>

          <SectionTitle>{title}</SectionTitle>

          <div className="mt-10">
            <SectionText>{description}</SectionText>
          </div>

        </div>

        {/* IMAGEN */}
        <div className="relative h-[520px] overflow-hidden group">

          {imageUrl ? (
            <Image
              src={imageUrl}
              alt=""
              fill
              sizes="(min-width: 1152px) 512px, (min-width: 1024px) calc(50vw - 64px), calc(100vw - 48px)"
              loading="lazy"
              className="img-premium object-cover object-center"
            />
          ) : (
            <div className="home-section__image-placeholder flex h-full items-center justify-center">
              <p className="text-xs uppercase tracking-[0.3em] text-[#E8E4DC]/20">
                Imagen historia
              </p>
            </div>
          )}

          <div className="absolute inset-0 bg-[var(--overlay-light)] transition-opacity duration-700 group-hover:opacity-0" />

        </div>

      </div>

    </section>
  )
}