import { createClient } from '@/lib/supabase/server'
import ImageGrid from './ImageGrid'

type UsageCounts = {
  productos: number
  contenido: number
  acabados: number
}

export default async function ImagesPage() {
  const supabase = await createClient()

  const { data: images } = await supabase
    .from('image')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  // Para saber qué imágenes se pueden borrar permanentemente,
  // comprobamos su uso en producto, contenido y acabados.
  // `page_image` queda fuera: no se escribe desde la app y su FK
  // `ON DELETE RESTRICT` impide el borrado si hay referencias.
  const [
    { data: productImageRows, error: productImageError },
    { data: contentBlockRows, error: contentBlockError },
    { data: acabadoRows, error: acabadoError },
  ] = await Promise.all([
    supabase.from('product_image').select('imagen_id'),
    supabase
      .from('content_block')
      .select('imagen_id')
      .not('imagen_id', 'is', null),
    supabase
      .from('acabado')
      .select('imagen_id')
      .not('imagen_id', 'is', null),
  ])

  const usageCheckFailed = Boolean(
    productImageError || contentBlockError || acabadoError
  )

  const usageById: Record<string, UsageCounts> = {}

  function addUsage(
    rows: { imagen_id: string | null }[] | null,
    key: keyof UsageCounts
  ) {
    for (const row of rows ?? []) {
      if (!row.imagen_id) continue

      const current = usageById[row.imagen_id] ?? {
        productos: 0,
        contenido: 0,
        acabados: 0,
      }

      current[key] += 1
      usageById[row.imagen_id] = current
    }
  }

  addUsage(productImageRows, 'productos')
  addUsage(contentBlockRows, 'contenido')
  addUsage(acabadoRows, 'acabados')

  return (
    <ImageGrid
      images={images ?? []}
      usageById={usageById}
      usageCheckFailed={usageCheckFailed}
    />
  )
}
