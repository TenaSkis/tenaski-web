import { createClient } from '@/lib/supabase/server'
import { safe } from '@/lib/supabase/safe'
import Hero from '@/components/home/Hero'
import GalleryGrid, { ImageItem } from '@/components/galery/GalleryGrid'
import CTA from '@/components/home/CTA'
import ScrollToTop from '@/components/ui/ScrollToTop'

function getImage(block: any): string | null {
  const img = block?.image
  if (!img) return null
  if (Array.isArray(img)) return img[0]?.ruta_storage ?? null
  return img.ruta_storage ?? null
}

export default async function GaleriaPage() {
  const supabase = await createClient()

  // Las 3 consultas salen en paralelo. Antes eran 3 'await' en fila.
  const [
    { data: heroBlock },
    { data: galleryRows },
    { data: ctaGaleria },
  ] = await Promise.all([
    // HERO GALERÍA
    safe(
      supabase
        .from('content_block')
        .select(`
          data,
          image:imagen_id (
            ruta_storage
          )
        `)
        .eq('seccion', 'hero_galeria')
        .single()
    ),

    safe(
      supabase
        .from('image')
        .select('ruta_storage, texto_alt, galeria_size, galeria_orden')
        .eq('en_galeria', true)
        .is('deleted_at', null)
        .order('galeria_orden', { ascending: true })
    ),

    // CTA GALERÍA
    safe(
      supabase
        .from('content_block')
        .select('data')
        .eq('seccion', 'cta_galeria')
        .single()
    ),
  ])

  const images: ImageItem[] = (galleryRows ?? []).map((row) => ({
    src: row.ruta_storage,
    alt: row.texto_alt ?? '',
    size: (row.galeria_size ?? 'md') as 'lg' | 'md' | 'sm',
  }))

  return (
    <main>
      <Hero
        imageUrl={getImage(heroBlock) ?? '/img/heroimg.png'}
        eyebrow={heroBlock?.data?.eyebrow ?? 'Galería'}
        title={heroBlock?.data?.titulo ?? 'La montaña, tal y como la vivimos.'}
        description={
          heroBlock?.data?.descripcion ??
          'Una selección de momentos, texturas y paisajes.'
        }
        buttons={[
          { text: 'Ver catálogo', href: '/catalogo', variant: 'primary' },
          { text: 'Volver al inicio', href: '/', variant: 'secondary' },
        ]}
      />

      <GalleryGrid images={images} />

      <CTA
        eyebrow={ctaGaleria?.data?.eyebrow ?? 'Inspiración'}
        title={ctaGaleria?.data?.titulo ?? 'Cada imagen cuenta una historia.'}
        description={
          ctaGaleria?.data?.descripcion ??
          'Descubre el catálogo completo o contáctanos.'
        }
        buttonText={ctaGaleria?.data?.buttonText ?? 'Ver catálogo'}
        buttonHref={ctaGaleria?.data?.buttonHref ?? '/catalogo'}
      />

      <ScrollToTop />
    </main>
  )
}