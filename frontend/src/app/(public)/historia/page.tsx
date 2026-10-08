import { createClient } from '@/lib/supabase/server'
import { safe } from '@/lib/supabase/safe'
import Hero from '@/components/home/Hero'
import Story from '@/components/history/Story'
import Values from '@/components/history/Values'
import Workshop from '@/components/history/Workshop'
import CTA from '@/components/home/CTA'
import ScrollToTop from '@/components/ui/ScrollToTop'

function getImage(block: any): string | null {
  const img = block?.image
  if (!img) return null
  if (Array.isArray(img)) return img[0]?.ruta_storage ?? null
  return img.ruta_storage ?? null
}

export default async function Historia() {
  const supabase = await createClient()

  // Las 3 consultas salen en paralelo. Antes eran 3 'await' en fila.
  const [{ data: heroBlock }, { data: historiaBlocks }, { data: ctaHistoria }] =
    await Promise.all([
      // HERO HISTORIA
      safe(
        supabase
          .from('content_block')
          .select(`
            data,
            image:imagen_id (
              ruta_storage
            )
          `)
          .eq('seccion', 'hero_historia')
          .single()
      ),

      // STORY + VALUES + WORKSHOP
      safe(
        supabase
          .from('content_block')
          .select(`
            seccion,
            data,
            image:imagen_id (
              ruta_storage
            )
          `)
          .in('seccion', [
            'historia_story',
            'historia_values',
            'historia_workshop',
          ])
      ),

      // CTA HISTORIA
      safe(
        supabase
          .from('content_block')
          .select('data')
          .eq('seccion', 'cta_historia')
          .single()
      ),
    ])

  const storyBlock =
    historiaBlocks?.find((block) => block.seccion === 'historia_story') ?? null
  const valuesBlock =
    historiaBlocks?.find((block) => block.seccion === 'historia_values') ?? null
  const workshopBlock =
    historiaBlocks?.find((block) => block.seccion === 'historia_workshop') ?? null

  type HistoryValue = {
    number?: string
    titulo?: string
    descripcion?: string
    title?: string
    description?: string
  }

  const defaultValues = [
    {
      number: '01',
      title: 'Artesanía',
      description:
        'Cada esquí se construye de forma individual, cuidando cada detalle.',
    },
    {
      number: '02',
      title: 'Durabilidad',
      description:
        'Diseñados para acompañarte durante muchos inviernos.',
    },
    {
      number: '03',
      title: 'Montaña',
      description:
        'Todo nace pensando en el terreno y en la experiencia real.',
    },
  ]

  const historyValues = Array.isArray(valuesBlock?.data?.values)
    ? valuesBlock.data.values.map((item: HistoryValue) => ({
        number: item.number ?? '01',
        title: item.titulo ?? item.title ?? '',
        description: item.descripcion ?? item.description ?? '',
      }))
    : defaultValues

  return (
    <>
      {/* HERO */}
      <Hero
        imageUrl={getImage(heroBlock) ?? '/img/heroimg.png'}
        eyebrow={
          heroBlock?.data?.eyebrow ??
          'Pirineos · Desde 2026'
        }
        title={
          heroBlock?.data?.titulo ??
          'Una historia nacida en la montaña.'
        }
        description={
          heroBlock?.data?.descripcion ??
          'Construimos esquís pensando en el tiempo, el terreno y las personas que los utilizarán.'
        }
        buttons={[
          { text: 'Ver catálogo', href: '/catalogo', variant: 'primary' },
          { text: 'Volver al inicio', href: '/', variant: 'secondary' },
        ]}
      />

      {/* STORY */}
      <Story
        eyebrow={storyBlock?.data?.eyebrow ?? 'El origen'}
        title={
          storyBlock?.data?.titulo ??
          'Todo empezó en un pequeño taller.'
        }
        description={
          storyBlock?.data?.descripcion ??
          'Tena Skis nace del deseo de recuperar una forma más humana de fabricar esquís, donde cada pieza tenga personalidad propia y una conexión directa con la montaña.'
        }
        imageUrl={getImage(storyBlock) ?? '/img/storyimg.jpeg'}
      />

      {/* VALUES */}
      {(valuesBlock?.data?.activo ?? true) && (
        <Values
          values={historyValues}
        />
      )}

      {/* WORKSHOP */}
      {(workshopBlock?.data?.activo ?? true) && (
        <Workshop
          eyebrow={workshopBlock?.data?.eyebrow ?? 'El taller'}
          title={
            workshopBlock?.data?.titulo ??
            'Donde la madera se convierte en montaña.'
          }
          description={
            workshopBlock?.data?.descripcion ??
            'No trabajamos en una fábrica. Trabajamos en un espacio donde cada herramienta, cada material y cada decisión forman parte del resultado final.'
          }
          imageUrl={getImage(workshopBlock) ?? '/img/workshoppimg.png'}
          details={
            workshopBlock?.data?.detalles ?? [
              'Maderas seleccionadas',
              'Herramientas tradicionales',
              'Acabados manuales',
            ]
          }
        />
      )}

      {/* CTA */}
      <CTA
        eyebrow={ctaHistoria?.data?.eyebrow ?? 'Continúa el viaje'}
        title={ctaHistoria?.data?.titulo ?? 'Cada esquí empieza como una idea.'}
        description={
          ctaHistoria?.data?.descripcion ??
          'Descubre una colección creada para durar muchos inviernos.'
        }
        buttonText={ctaHistoria?.data?.buttonText ?? 'Explorar catálogo'}
        buttonHref={ctaHistoria?.data?.buttonHref ?? '/catalogo'}
      />

      <ScrollToTop />
    </>
  )
}