import { createClient } from '@/lib/supabase/server'
import HeroContentForm from './HeroContentForm'
import ManifestoContentForm from './ManifestoContentForm'
import ProcessContentForm from './ProcessContentForm'
import StoryContentForm from './StoryContentForm'
import ValuesContentForm from './ValuesContentForm'
import WorkshopContentForm from './WorkshopContentForm'
import CTAContentForm from './CTAContentForm'
import IntroContentForm from './IntroContentForm'
import AcabadosContentForm from './AcabadosContentForm'
import AcabadosPremiumContentForm from './AcabadosPremiumContentForm'
import SectionGroup from './Sectiongroup'
import ScrollToTop from '@/components/ui/ScrollToTop'

export default async function ContentPage() {
  const supabase = await createClient()

  // ─────────────────────────────────────────────
  // HEROES
  // ─────────────────────────────────────────────
  const { data: heroBlocks } = await supabase
    .from('content_block')
    .select(`
      id,
      seccion,
      data,
      imagen_id,
      image:imagen_id (
        id,
        ruta_storage
      )
    `)
    .in('seccion', [
      'hero_home',
      'hero_historia',
      'hero_catalogo',
      'hero_galeria',
      'hero_contacto',
    ])

  // ─────────────────────────────────────────────
  // LIBRERÍA DE IMÁGENES
  // ─────────────────────────────────────────────
  const { data: imageLibrary } = await supabase
    .from('image')
    .select('id, ruta_storage, nombre_archivo')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  // ─────────────────────────────────────────────
  // MANIFESTO (HOME)
  // ─────────────────────────────────────────────
  const { data: manifesto } = await supabase
    .from('content_block')
    .select(`
      id,
      seccion,
      data,
      imagen_id,
      image:imagen_id (
        id,
        ruta_storage
      )
    `)
    .eq('seccion', 'home_manifesto')
    .single()

  // ─────────────────────────────────────────────
  // PROCESS (HOME)
  // ─────────────────────────────────────────────
  const { data: processBlocks } = await supabase
    .from('content_block')
    .select('*, image:imagen_id (id, ruta_storage)')
    .in('seccion', [
      'home_process',
      'home_process_step_1',
      'home_process_step_2',
      'home_process_step_3',
      'home_process_step_4',
    ])

  const process =
    processBlocks?.find((p) => p.seccion === 'home_process') ?? null

  const steps = Object.fromEntries(
    processBlocks
      ?.filter((p) => p.seccion.includes('step'))
      .map((p) => [
        p.seccion,
        {
          titulo: p.data?.titulo,
          descripcion: p.data?.descripcion,
          imagen_id: p.imagen_id ?? null,
          image: p.image ?? null,
        },
      ]) ?? []
  )

  // ─────────────────────────────────────────────
  // ACABADOS (HOME)
  // ─────────────────────────────────────────────
  const { data: acabadosBlock } = await supabase
    .from('content_block')
    .select('id, seccion, data')
    .eq('seccion', 'acabados_home')
    .single()

  const { data: acabadosRows } = await supabase
    .from('acabado')
    .select(`
      id,
      nombre,
      descripcion,
      imagen_id,
      sin_grabado,
      image:imagen_id (
        id,
        ruta_storage
      )
    `)
    .eq('es_premium', false)
    .order('orden', { ascending: true })

  // ─────────────────────────────────────────────
  // ACABADOS PREMIUM (HOME)
  // ─────────────────────────────────────────────
  const { data: acabadosPremiumBlock } = await supabase
    .from('content_block')
    .select('id, seccion, data')
    .eq('seccion', 'acabados_premium_home')
    .single()

  const { data: acabadosPremiumRows } = await supabase
    .from('acabado')
    .select(`
      id,
      nombre,
      descripcion,
      precio_extra,
      imagen_id,
      sin_grabado,
      image:imagen_id (
        id,
        ruta_storage
      )
    `)
    .eq('es_premium', true)
    .order('orden', { ascending: true })
    
  // ─────────────────────────────────────────────
  // HISTORIA
  // ─────────────────────────────────────────────
  const { data: historiaBlocks } = await supabase
    .from('content_block')
    .select(`
      id,
      seccion,
      data,
      imagen_id,
      image:imagen_id (
        id,
        ruta_storage
      )
    `)
    .in('seccion', [
      'historia_story',
      'historia_values',
      'historia_workshop',
    ])

  const storyBlock =
    historiaBlocks?.find((block) => block.seccion === 'historia_story') ?? null
  const valuesBlock =
    historiaBlocks?.find((block) => block.seccion === 'historia_values') ?? null
  const workshopBlock =
    historiaBlocks?.find((block) => block.seccion === 'historia_workshop') ?? null

  // ─────────────────────────────────────────────
  // CTAs (todas las páginas)
  // ─────────────────────────────────────────────
  const { data: ctaBlocks } = await supabase
    .from('content_block')
    .select('id, seccion, data')
    .in('seccion', ['cta_home', 'cta_historia', 'cta_catalogo', 'cta_galeria'])

  const getCTABlock = (seccion: string) =>
    ctaBlocks?.find((block) => block.seccion === seccion) ?? null

  // ─────────────────────────────────────────────
  // INTRO CATÁLOGO
  // ─────────────────────────────────────────────
  const { data: introCatalogo } = await supabase
    .from('content_block')
    .select('id, seccion, data')
    .eq('seccion', 'catalogo_intro')
    .single()

  const getBlock = (seccion: string) =>
    heroBlocks?.find((block) => block.seccion === seccion) ?? null

  return (
    <>
    <div className="space-y-12">
      {/* HEADER */}
      <div>
        <h1 className="text-4xl font-semibold">Contenido</h1>
        <p className="mt-2 text-zinc-400">
          Edita los textos e imágenes de la web pública.
        </p>
      </div>

      {/* ───────────────────────────── */}
      {/* HOME */}
      {/* ───────────────────────────── */}
      <SectionGroup
        title="Home"
        description="Cabecera, manifiesto, proceso, Acabados y CTA de la página principal."
        count={6}
      >
        <HeroContentForm
          titulo="Cabecera · Home"
          seccion="hero_home"
          block={getBlock('hero_home')}
          imageLibrary={imageLibrary ?? []}
        />

        <ManifestoContentForm
          block={manifesto ?? null}
          imageLibrary={imageLibrary ?? []}
        />

        <ProcessContentForm
          block={process}
          steps={steps}
          imageLibrary={imageLibrary ?? []}
        />

        <AcabadosContentForm
          block={acabadosBlock ?? null}
          acabados={acabadosRows ?? []}
        />

        <AcabadosPremiumContentForm
          block={acabadosPremiumBlock ?? null}
          acabados={acabadosPremiumRows ?? []}
        />

        <CTAContentForm
          titulo="CTA · Home"
          seccion="cta_home"
          block={getCTABlock('cta_home')}
          defaults={{
            eyebrow: 'Empieza el viaje',
            titulo: 'Cada esquí empieza como un trozo de madera.',
            descripcion:
              'Descubre una colección creada para durar, evolucionar y acompañarte durante muchos inviernos.',
            buttonText: 'Explorar catálogo',
            buttonHref: '/catalogo',
          }}
        />
         
      </SectionGroup>

      {/* ───────────────────────────── */}
      {/* HISTORIA */}
      {/* ───────────────────────────── */}
      <SectionGroup
        title="Historia"
        description="Cabecera, relato, valores, taller y CTA."
        count={5}
      >
        <HeroContentForm
          titulo="Cabecera · Historia"
          seccion="hero_historia"
          block={getBlock('hero_historia')}
          imageLibrary={imageLibrary ?? []}
        />

        <StoryContentForm
          block={storyBlock}
          imageLibrary={imageLibrary ?? []}
        />

        <ValuesContentForm block={valuesBlock} />

        <WorkshopContentForm
          block={workshopBlock}
          imageLibrary={imageLibrary ?? []}
        />

        <CTAContentForm
          titulo="CTA · Historia"
          seccion="cta_historia"
          block={getCTABlock('cta_historia')}
          defaults={{
            eyebrow: 'Continúa el viaje',
            titulo: 'Cada esquí empieza como una idea.',
            descripcion: 'Descubre una colección creada para durar muchos inviernos.',
            buttonText: 'Explorar catálogo',
            buttonHref: '/catalogo',
          }}
        />
      </SectionGroup>

      {/* ───────────────────────────── */}
      {/* CATÁLOGO */}
      {/* ───────────────────────────── */}
      <SectionGroup
        title="Catálogo"
        description="Cabecera, introducción y CTA de la página de catálogo."
        count={3}
      >
        <HeroContentForm
          titulo="Cabecera · Catálogo"
          seccion="hero_catalogo"
          block={getBlock('hero_catalogo')}
          imageLibrary={imageLibrary ?? []}
        />

        <IntroContentForm
          titulo="Introducción · Catálogo"
          seccion="catalogo_intro"
          block={introCatalogo ?? null}
          defaults={{
            eyebrow: 'La colección',
            titulo: 'Cada modelo tiene una personalidad propia.',
            descripcion:
              'No fabricamos productos en serie. Cada esquí se diseña pensando en la experiencia que ofrecerá en la montaña.',
          }}
        />

        <CTAContentForm
          titulo="CTA · Catálogo"
          seccion="cta_catalogo"
          block={getCTABlock('cta_catalogo')}
          defaults={{
            eyebrow: 'Encuentra tu modelo',
            titulo: 'Cada montaña merece un esquí diferente.',
            descripcion:
              'Descubre una colección artesanal creada para acompañarte durante muchos inviernos.',
            buttonText: 'Contactar',
            buttonHref: '/contacto',
          }}
        />
      </SectionGroup>

      {/* ───────────────────────────── */}
      {/* GALERÍA */}
      {/* ───────────────────────────── */}
      <SectionGroup
        title="Galería"
        description="Cabecera y CTA de la página de galería."
        count={2}
      >
        <HeroContentForm
          titulo="Cabecera · Galería"
          seccion="hero_galeria"
          block={getBlock('hero_galeria')}
          imageLibrary={imageLibrary ?? []}
        />

        <CTAContentForm
          titulo="CTA · Galería"
          seccion="cta_galeria"
          block={getCTABlock('cta_galeria')}
          defaults={{
            eyebrow: 'Inspiración',
            titulo: 'Cada imagen cuenta una historia.',
            descripcion: 'Descubre el catálogo completo o contáctanos.',
            buttonText: 'Ver catálogo',
            buttonHref: '/catalogo',
          }}
        />
      </SectionGroup>

      {/* ───────────────────────────── */}
      {/* CONTACTO */}
      {/* ───────────────────────────── */}
      <SectionGroup
        title="Contacto"
        description="Cabecera de la página de contacto."
        count={1}
      >
        <HeroContentForm
          titulo="Cabecera · Contacto"
          seccion="hero_contacto"
          block={getBlock('hero_contacto')}
          imageLibrary={imageLibrary ?? []}
        />
      </SectionGroup>
    </div>

    <ScrollToTop />
    </>
  )
}