'use client'

import GalleryItem from './GalleryItem'

export type ImageSize = 'sm' | 'md' | 'lg'

export type ImageItem = {
  src: string
  alt: string
  size?: ImageSize
}

type GalleryGridProps = {
  images: ImageItem[]
}

export default function GalleryGrid({ images }: GalleryGridProps) {
  return (
    <section className="home-section py-20">
      <div className="mx-auto max-w-6xl px-6">

        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 auto-rows-[180px]">

          {images.map((img, index) => (
            <GalleryItem
              key={`${img.src}-${index}`}
              src={img.src}
              alt={img.alt}
              size={img.size}
            />
          ))}

        </div>

      </div>
    </section>
  )
}