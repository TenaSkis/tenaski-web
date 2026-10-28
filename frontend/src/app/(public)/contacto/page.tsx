import { createClient } from '@/lib/supabase/server'
import Hero from '@/components/home/Hero'
import ContactForm from '@/components/contact/ContactForm'

type ImageRef = { ruta_storage: string }
type ImageBlock = { image?: ImageRef | ImageRef[] | null }

function getImage(block: ImageBlock | null): string | null {
  const img = block?.image
  if (!img) return null
  if (Array.isArray(img)) return img[0]?.ruta_storage ?? null
  return img.ruta_storage ?? null
}


export default async function ContactoPage() {
  const supabase = await createClient()
  const { data: heroBlock } = await supabase
    .from('content_block')
    .select(`
      data,
      image:imagen_id (
        ruta_storage
      )
    `)
    .eq('seccion', 'hero_contacto')
    .single()

  return (
    <main>

      <Hero
        imageUrl={getImage(heroBlock) ?? '/img/heroimg.png'}
        eyebrow={
          heroBlock?.data?.eyebrow ??
          'Contacto'
        }
        title={
          heroBlock?.data?.titulo ??
          'Hablemos de tu próximo esquí'
        }
        description={
          heroBlock?.data?.descripcion ??
          'Cuéntanos qué buscas y te responderemos personalmente.'
        }

        buttons={[
          { text: 'Ver catálogo', href: '/catalogo', variant: 'primary' },
          { text: 'Volver al inicio', href: '/', variant: 'secondary' },
        ]}
      />

      <section className="mx-auto max-w-6xl px-6 py-20">
        <ContactForm />
      </section>

    </main>
  )
}