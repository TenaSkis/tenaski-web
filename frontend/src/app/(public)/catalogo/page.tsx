import { createClient } from '@/lib/supabase/server'
import { safe } from '@/lib/supabase/safe'
import Hero from '@/components/home/Hero'
import Intro from '@/components/catalog/Intro'
import ProductGrid from '@/components/catalog/ProductGrid'
import CTA from '@/components/home/CTA'
import ScrollToTop from '@/components/ui/ScrollToTop'

function getImage(block: any): string | null {
  const img = block?.image
  if (!img) return null
  if (Array.isArray(img)) return img[0]?.ruta_storage ?? null
  return img.ruta_storage ?? null
}

// ─── Tipos ────────────────────────────────────────────────
type ProductRow = {
  id: string
  nombre: string
  slug: string
  descripcion_corta: string | null
  product_image: {
    imagen_principal: boolean
    image: {
      ruta_storage: string
    }
  }[]
}

// ─────────────────────────────────────────────────────────
// Server Component: sin 'use client', fetch directo
// ─────────────────────────────────────────────────────────
export default async function Catalogo() {
  const supabase = await createClient()

  // Las 4 consultas salen en paralelo. Antes eran 4 'await' en fila.
  const [
    { data: heroBlock },
    { data: introBlock },
    { data: ctaCatalogo },
    { data, error },
  ] = await Promise.all([
    // HERO CATÁLOGO
    safe(
      supabase
        .from('content_block')
        .select(`
          data,
          image:imagen_id (
            ruta_storage
          )
        `)
        .eq('seccion', 'hero_catalogo')
        .single()
    ),

    // INTRO CATÁLOGO
    safe(
      supabase
        .from('content_block')
        .select('data')
        .eq('seccion', 'catalogo_intro')
        .single()
    ),

    // CTA CATÁLOGO
    safe(
      supabase
        .from('content_block')
        .select('data')
        .eq('seccion', 'cta_catalogo')
        .single()
    ),

    // Traer productos publicados con su imagen principal
    safe(
      supabase
        .from('product')
        .select(`
          id,
          nombre,
          slug,
          descripcion_corta,
          product_image (
            imagen_principal,
            orden,
            image:imagen_id (
              ruta_storage
            )
          )
        `)
        .eq('publicado', true)
        .order('created_at', { ascending: false })
    ),
  ])

  const heroData = heroBlock?.data ?? {}

  if (error) {
    console.error('Error cargando catálogo:', error.message)
  }

  const products = (data ?? []) as unknown as ProductRow[]

  // Mapear al formato que espera ProductGrid
  const gridProducts = products.map((p) => {
    // Buscar imagen principal; si no hay, coger la primera
    const principalEntry =
      p.product_image.find((pi) => pi.imagen_principal) ??
      p.product_image[0]

    return {
      name: p.nombre,
      description: p.descripcion_corta ?? '',
      slug: p.slug,
      imageUrl: principalEntry?.image?.ruta_storage ?? '/img/manifestoimg.png',
    }
  })

  return (
    <main>
      <Hero
        imageUrl={getImage(heroBlock) ?? '/img/heroimg.png'}
        eyebrow={
          heroData.eyebrow ??
          'Colección'
        }
        title={
          heroData.titulo ??
          'Nuestros esquís.'
        }
        description={
          heroData.descripcion ??
          'Cada modelo nace para un terreno, una forma de esquiar y una manera distinta de entender la montaña.'
        }
        buttons={[
          { text: 'Nuestra historia', href: '/historia', variant: 'secondary' },
          { text: 'Contactar', href: '/contacto', variant: 'primary' },
        ]}
      />

      <Intro
        eyebrow={introBlock?.data?.eyebrow ?? 'La colección'}
        title={introBlock?.data?.titulo ?? 'Cada modelo tiene una personalidad propia.'}
        description={
          introBlock?.data?.descripcion ??
          'No fabricamos productos en serie. Cada esquí se diseña pensando en la experiencia que ofrecerá en la montaña.'
        }
      />

      <ProductGrid products={gridProducts} />

      <CTA
        eyebrow={ctaCatalogo?.data?.eyebrow ?? 'Encuentra tu modelo'}
        title={ctaCatalogo?.data?.titulo ?? 'Cada montaña merece un esquí diferente.'}
        description={
          ctaCatalogo?.data?.descripcion ??
          'Descubre una colección artesanal creada para acompañarte durante muchos inviernos.'
        }
        buttonText={ctaCatalogo?.data?.buttonText ?? 'Contactar'}
        buttonHref={ctaCatalogo?.data?.buttonHref ?? '/contacto'}
      />

      <ScrollToTop />
    </main>
  )
}