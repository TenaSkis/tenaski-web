import { createClient } from '@/lib/supabase/server'
import { safe } from '@/lib/supabase/safe'

import Hero from '@/components/home/Hero'
import Manifesto from '@/components/home/Manifesto'
import Process from '@/components/home/Process'
import Acabados from '@/components/home/Acabados'
import FeaturedProduct from '@/components/home/FeaturedProduct'
import CTA from '@/components/home/CTA'
import ScrollToTop from '@/components/ui/ScrollToTop'

// ─────────────────────────────────────────────
// HELPER: extrae ruta_storage sea objeto o array
// (Supabase a veces tipa la relación embebida como
// array aunque en runtime devuelva un solo objeto)
// ─────────────────────────────────────────────
function getImage(block: any): string | null {
  const img = block?.image
  if (!img) return null
  if (Array.isArray(img)) return img[0]?.ruta_storage ?? null
  return img.ruta_storage ?? null
}

export default async function Home() {
  const supabase = await createClient()

  // ─────────────────────────────────────────────
  // HERO HOME
  // MANIFESTO HOME
  // PROCESS HOME + STEPS
  // ACABADOS
  // ACABADOS PREMIUM
  // CTA HOME
  // PRODUCTO DESTACADO
  //
  // Las 9 consultas salen en paralelo. Antes eran
  // 9 'await' en fila, así que el tiempo total era
  // la suma de los 9 viajes a Supabase.
  // ─────────────────────────────────────────────
  const [
    { data: hero },
    { data: manifesto },
    { data: processBlocks },
    { data: acabadosBlock },
    { data: acabadosRows },
    { data: acabadosPremiumBlock },
    { data: acabadosPremiumRows },
    { data: ctaHome },
    { data: featured },
  ] = await Promise.all([
    // HERO HOME
    safe(
      supabase
        .from('content_block')
        .select('data, image:imagen_id (ruta_storage)')
        .eq('seccion', 'hero_home')
        .single()
    ),

    // MANIFESTO HOME
    safe(
      supabase
        .from('content_block')
        .select('data, image:imagen_id (ruta_storage)')
        .eq('seccion', 'home_manifesto')
        .single()
    ),

    // PROCESS HOME + STEPS
    safe(
      supabase
        .from('content_block')
        .select('seccion, data, image:imagen_id (ruta_storage)')
        .in('seccion', [
          'home_process',
          'home_process_step_1',
          'home_process_step_2',
          'home_process_step_3',
          'home_process_step_4',
        ])
    ),

    // ACABADOS
    safe(
      supabase
        .from('content_block')
        .select('data')
        .eq('seccion', 'acabados_home')
        .single()
    ),

    safe(
      supabase
        .from('acabado')
        .select('id, nombre, descripcion, image:imagen_id (ruta_storage)')
        .order('orden', { ascending: true })
    ),

    // ACABADOS PREMIUM
    safe(
      supabase
        .from('content_block')
        .select('data')
        .eq('seccion', 'acabados_premium_home')
        .single()
    ),

    safe(
      supabase
        .from('acabado')
        .select('id, nombre, descripcion, precio_extra, image:imagen_id (ruta_storage)')
        .eq('es_premium', true)
        .order('orden', { ascending: true })
    ),

    // CTA HOME
    safe(
      supabase
        .from('content_block')
        .select('data')
        .eq('seccion', 'cta_home')
        .single()
    ),

    // PRODUCTO DESTACADO (lo dejas igual)
    safe(
      supabase
        .from('product')
        .select(`
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
        .eq('destacado', true)
        .limit(1)
        .single()
    ),
  ])

  // ─────────────────────────────────────────────
  // Derivados de las consultas anteriores
  // ─────────────────────────────────────────────
  const process = processBlocks?.find((p) => p.seccion === 'home_process')

  const step = (n: number) =>
    processBlocks?.find((p) => p.seccion === `home_process_step_${n}`)

  const acabados = (acabadosRows ?? []).map((a) => ({
    id: a.id,
    nombre: a.nombre,
    descripcion: a.descripcion,
    imageUrl: getImage(a) ?? null,
  }))

  const acabadosPremium = (acabadosPremiumRows ?? []).map((a) => ({
    id: a.id,
    nombre: a.nombre,
    descripcion: a.descripcion,
    precioExtra: a.precio_extra,
    imageUrl: getImage(a) ?? null,
  }))

  const featuredImage = featured
    ? (() => {
        const imgs = featured.product_image as any[]
        const main = imgs.find((pi) => pi.imagen_principal) ?? imgs[0]
        return main?.image?.ruta_storage ?? '/img/manifestoimg.png'
      })()
    : '/img/manifestoimg.png'

  return (
    <>
      {/* HERO */}
      <Hero
        imageUrl={getImage(hero) ?? '/img/heroimg.png'}
        eyebrow={hero?.data?.eyebrow ?? ''}
        title={hero?.data?.titulo ?? ''}
        description={hero?.data?.descripcion ?? ''}
        buttons={[
          { text: 'Ver catálogo', href: '/catalogo', variant: 'primary' },
          { text: 'Nuestra historia', href: '/historia', variant: 'secondary' },
        ]}
      />

      {/* MANIFESTO */}
      <Manifesto
        imageUrl={getImage(manifesto) ?? '/img/manifestoimg.png'}
        eyebrow={manifesto?.data?.eyebrow ?? ''}
        title={manifesto?.data?.titulo ?? ''}
        description={manifesto?.data?.descripcion ?? ''}
      />

      {/* PROCESS */}
      {(process?.data?.activo ?? true) && (
        <Process
          eyebrow={process?.data?.eyebrow ?? ''}
          title={process?.data?.titulo ?? ''}
          description={process?.data?.descripcion ?? ''}
          steps={[
            {
              title: step(1)?.data?.titulo ?? '',
              description: step(1)?.data?.descripcion ?? '',
              imageUrl: getImage(step(1)) ?? '/img/designimg.png',
              imageAlt: 'Step 1',
            },
            {
              title: step(2)?.data?.titulo ?? '',
              description: step(2)?.data?.descripcion ?? '',
              imageUrl: getImage(step(2)) ?? '/img/woodimg.jpeg',
              imageAlt: 'Step 2',
            },
            {
              title: step(3)?.data?.titulo ?? '',
              description: step(3)?.data?.descripcion ?? '',
              imageUrl: getImage(step(3)) ?? '/img/buildimg.jpeg',
              imageAlt: 'Step 3',
            },
            {
              title: step(4)?.data?.titulo ?? '',
              description: step(4)?.data?.descripcion ?? '',
              imageUrl: getImage(step(4)) ?? '/img/finishimg.png',
              imageAlt: 'Step 4',
            },
          ]}
        />
      )}

      {/* ACABADOS */}
      {(acabadosBlock?.data?.activo ?? true) && (
        <Acabados
          eyebrow={acabadosBlock?.data?.eyebrow ?? 'Acabados'}
          description={
            acabadosBlock?.data?.descripcion ??
            'Cada esquí puede personalizarse con distintos acabados de madera.'
          }
          acabados={acabados}
        />
      )}
{/* ACABADOS PREMIUM */}
      {(acabadosPremiumBlock?.data?.activo ?? true) && (
        <Acabados
          eyebrow={acabadosPremiumBlock?.data?.eyebrow ?? 'Acabados premium'}
          description={
            acabadosPremiumBlock?.data?.descripcion ??
            'Acabados exclusivos con un coste adicional sobre el precio base.'
          }
          acabados={acabadosPremium}
        />
      )}

      {/* FEATURED PRODUCT */}
      {featured ? (
        <FeaturedProduct
          eyebrow="Producto destacado"
          name={featured.nombre}
          description={featured.descripcion_corta ?? ''}
          imageUrl={featuredImage}
          buttonText="Descubrir modelo"
          buttonHref={`/catalogo/${featured.slug}`}
        />
      ) : null}

      {/* CTA */}
      <CTA
        eyebrow={ctaHome?.data?.eyebrow ?? 'Empieza el viaje'}
        title={ctaHome?.data?.titulo ?? 'Cada esquí empieza como un trozo de madera.'}
        description={
          ctaHome?.data?.descripcion ??
          'Descubre una colección creada para durar, evolucionar y acompañarte durante muchos inviernos.'
        }
        buttonText={ctaHome?.data?.buttonText ?? 'Explorar catálogo'}
        buttonHref={ctaHome?.data?.buttonHref ?? '/catalogo'}
      />

      <ScrollToTop />
    </>
  )
}