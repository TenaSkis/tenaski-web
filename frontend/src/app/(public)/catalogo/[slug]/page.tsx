import { createClient } from '@/lib/supabase/server'
import { safe } from '@/lib/supabase/safe'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { cache } from 'react'
import ProductGallery from '@/components/catalog/ProductGallery'
import DesignModal from '@/components/catalog/DesignModal'
import SimpleOrderModal from '@/components/catalog/SimpleOrderModal'

export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ slug: string }>
}

type ImageRow = {
  imagen_principal: boolean
  orden: number
  image: {
    ruta_storage: string
    texto_alt: string | null
  }
}

function getImage(block: any): string | null {
  const img = block?.image
  if (!img) return null
  if (Array.isArray(img)) return img[0]?.ruta_storage ?? null
  return img.ruta_storage ?? null
}

// `cache()` de React deduplica la llamada dentro del mismo render: antes
// generateMetadata y la página pedían el producto por separado y se
// pagaba el viaje a Supabase dos veces.
const getProducto = cache(async (slug: string) => {
  const supabase = await createClient()

  const { data } = await supabase
    .from('product')
    .select(`
      id,
      nombre,
      slug,
      descripcion_corta,
      descripcion_larga,
      precio,
      medidas,
      precio_extra_espatula,
      precio_extra_cola,
      otro_producto,
      product_image (
        imagen_principal,
        orden,
        image:imagen_id (
          ruta_storage,
          texto_alt
        )
      )
    `)
    .eq('slug', slug)
    .eq('publicado', true)
    .single()

  return data
})

export async function generateMetadata({ params }: Props) {
  const { slug } = await params

  const data = await getProducto(slug)

  if (!data) return {}

  return {
    title: `${data.nombre} — Tena Skis`,
    description: data.descripcion_corta ?? undefined,
  }
}

export default async function ProductoPage({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()

  // El producto viene de la misma función cacheada que usa
  // generateMetadata, así que no se vuelve a pedir. Los dos listings de
  // acabados salen en paralelo entre sí.
  const [data, { data: acabadosRows }, { data: acabadosPremiumRows }] =
    await Promise.all([
      getProducto(slug),

      safe(
        supabase
          .from('acabado')
          .select('id, nombre, sin_grabado, image:imagen_id (ruta_storage)')
          .eq('es_premium', false)
          .order('orden', { ascending: true })
      ),

      safe(
        supabase
          .from('acabado')
          .select('id, nombre, precio_extra, sin_grabado, image:imagen_id (ruta_storage)')
          .eq('es_premium', true)
          .order('orden', { ascending: true })
      ),
    ])

  if (!data) notFound()

  const images = (data.product_image as unknown as ImageRow[])
    .sort((a, b) => {
      if (a.imagen_principal && !b.imagen_principal) return -1
      if (!a.imagen_principal && b.imagen_principal) return 1
      return a.orden - b.orden
    })
    .map((pi) => ({
      url: pi.image.ruta_storage,
      alt: pi.image.texto_alt ?? data.nombre,
      principal: pi.imagen_principal,
    }))

  // ─────────────────────────────────────────────
  // ACABADOS (para "Crea tu diseño")
  // ─────────────────────────────────────────────
  const acabados = (acabadosRows ?? []).map((a) => ({
  id: a.id,
  nombre: a.nombre,
  imageUrl: getImage(a) ?? null,
  sinGrabado: a.sin_grabado,
}))

  const acabadosPremium = (acabadosPremiumRows ?? []).map((a) => ({
  id: a.id,
  nombre: a.nombre,
  imageUrl: getImage(a) ?? null,
  precioExtra: a.precio_extra ?? 0,
  sinGrabado: a.sin_grabado,
}))

  return (
    <main className="min-h-screen text-[var(--foreground)] pt-[80px] lg:pt-0">
      <div className="lg:min-h-screen lg:grid lg:grid-cols-2">
        <div className="h-[60vw] lg:h-auto lg:sticky lg:top-0 lg:h-screen bg-[var(--surface)] overflow-hidden">
          <ProductGallery images={images} nombre={data.nombre} />
        </div>

        <div className="flex flex-col justify-center px-8 py-16 lg:px-16 lg:py-24">
          <div className="max-w-md">
            <p className="text-xs tracking-[0.25em] uppercase text-[var(--accent)] mb-6">
              Tena Skis · Artesanal
            </p>

            <h1 className="home-section__title mb-2">
              {data.nombre}
            </h1>

            <p className="text-2xl font-light text-[var(--foreground)]/50 mb-8">
              {data.precio.toLocaleString('es-ES', {
                style: 'currency',
                currency: 'EUR',
              })}
            </p>

            <div className="w-12 h-px bg-[var(--accent)] mb-8" />

            {data.descripcion_corta && (
              <p className="text-base text-[var(--foreground)]/70 leading-relaxed mb-8 font-light">
                {data.descripcion_corta}
              </p>
            )}

            {data.descripcion_larga && (
              <p className="text-sm text-[var(--text-soft)] whitespace-pre-line leading-loose mb-12">
                {data.descripcion_larga}
              </p>
            )}

            <Link
              href="/contacto"
              className="
                inline-flex items-center justify-center gap-3
                bg-[var(--accent)] text-[var(--background)]
                px-8 py-4 text-sm font-medium tracking-[0.15em] uppercase
                hover:bg-[var(--accent-hover)] transition-colors
                w-full lg:w-auto
              "
            >
              Solicitar información
              <span>→</span>
            </Link>

            {data.otro_producto ? (
              <SimpleOrderModal product={{ id: data.id, nombre: data.nombre, slug: data.slug, precio: data.precio }} />
            ) : (
              <DesignModal
                product={{ id: data.id, nombre: data.nombre, slug: data.slug, precio: data.precio }}
                acabados={acabados}
                acabadosPremium={acabadosPremium}
                medidas={data.medidas ?? []}
                precioExtraEspatula={data.precio_extra_espatula ?? 0}
                precioExtraCola={data.precio_extra_cola ?? 0}
              />
            )}

            <div className="mt-16 pt-8 border-t border-[var(--border)] flex items-center justify-between text-xs text-[var(--text-disabled)]">
              <span className="tracking-widest uppercase">Hecho en el Pirineo</span>
              <Link href="/catalogo" className="hover:text-[var(--foreground)]/40 transition-colors">
                  ← Volver al catálogo
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}