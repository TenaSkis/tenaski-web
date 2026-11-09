'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type GallerySize = 'lg' | 'md' | 'sm'

// ─────────────────────────────────────────────
// Añadir / editar en galería (mismo action sirve para ambos casos:
// si ya estaba en galería, simplemente actualiza tamaño/alt)
// ─────────────────────────────────────────────
export async function addToGallery(
  imageId: string,
  size: GallerySize,
  alt: string,
  orden: number
) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('image')
    .update({
      en_galeria: true,
      galeria_size: size,
      galeria_orden: orden,
      texto_alt: alt,
    })
    .eq('id', imageId)

  if (error) throw error

  revalidatePath('/admin/images')
  revalidatePath('/galeria')
}

// ─────────────────────────────────────────────
// Quitar de galería (no borra la imagen, solo el flag)
// ─────────────────────────────────────────────
export async function removeFromGallery(imageId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('image')
    .update({ en_galeria: false })
    .eq('id', imageId)

  if (error) throw error

  revalidatePath('/admin/images')
  revalidatePath('/galeria')
}

// ─────────────────────────────────────────────
// Uso de una imagen en las distintas referencias.
// `complete` indica si todas las consultas terminaron correctamente.
// ─────────────────────────────────────────────
export type ImageUsage = {
  productos: number
  contenido: number
  acabados: number
  enGaleria: boolean
  inUse: boolean
  complete: boolean
  error?: string
}

// ─────────────────────────────────────────────
// Comprobar si una imagen está referenciada en otra parte
// (producto, contenido, acabado o galería).
//
// `page_image` no se consulta aquí: la aplicación no escribe en esa
// tabla y el rol de la API no tiene SELECT sobre ella. Su protección
// se mantiene mediante la FK `page_image.imagen_id ON DELETE RESTRICT`,
// que rechaza el borrado de la fila de `image` si hay referencias.
// ─────────────────────────────────────────────
export async function getImageUsage(imageId: string): Promise<ImageUsage> {
  const supabase = await createClient()

  try {
    const [product, content, acabado, image] = await Promise.all([
      supabase
        .from('product_image')
        .select('*', { count: 'exact', head: true })
        .eq('imagen_id', imageId),
      supabase
        .from('content_block')
        .select('*', { count: 'exact', head: true })
        .eq('imagen_id', imageId),
      supabase
        .from('acabado')
        .select('*', { count: 'exact', head: true })
        .eq('imagen_id', imageId),
      supabase
        .from('image')
        .select('en_galeria')
        .eq('id', imageId)
        .maybeSingle(),
    ])

    const productos = product.count ?? 0
    const contenido = content.count ?? 0
    const acabados = acabado.count ?? 0
    const enGaleria = image.data?.en_galeria ?? false

    const errors: string[] = []
    if (product.error) errors.push(product.error.message)
    if (content.error) errors.push(content.error.message)
    if (acabado.error) errors.push(acabado.error.message)
    if (image.error) errors.push(image.error.message)

    // Si no se pudo confirmar que la fila existe, tampoco se puede
    // garantizar que no esté en uso.
    if (errors.length > 0 || !image.data) {
      return {
        productos,
        contenido,
        acabados,
        enGaleria,
        inUse: false,
        complete: false,
        error:
          errors.join('; ') ||
          'La imagen no existe o no se pudo leer.',
      }
    }

    return {
      productos,
      contenido,
      acabados,
      enGaleria,
      inUse: productos + contenido + acabados > 0 || enGaleria,
      complete: true,
    }
  } catch (error) {
    return {
      productos: 0,
      contenido: 0,
      acabados: 0,
      enGaleria: false,
      inUse: false,
      complete: false,
      error:
        error instanceof Error ? error.message : 'Error desconocido',
    }
  }
}

// ─────────────────────────────────────────────
// Eliminar permanentemente (bloquea si hay referencias o galería)
// ─────────────────────────────────────────────
export async function deleteImagePermanently(
  imageId: string,
  rutaStorage: string
) {
  const supabase = await createClient()
  const usage = await getImageUsage(imageId)

  if (!usage.complete) {
    throw new Error(
      'No se puede eliminar: no se pudo verificar si la imagen está en uso. Inténtalo de nuevo.'
    )
  }

  const reasons: string[] = []

  if (usage.enGaleria) {
    reasons.push('está publicada en la galería')
  }
  if (usage.acabados > 0) {
    reasons.push(`está en uso en ${usage.acabados} acabado(s)`)
  }
  if (usage.productos > 0) {
    reasons.push(`está en uso en ${usage.productos} producto(s)`)
  }
  if (usage.contenido > 0) {
    reasons.push(
      `está en uso en ${usage.contenido} bloque(s) de contenido`
    )
  }

  if (reasons.length > 0) {
    throw new Error(
      `No se puede eliminar: la imagen ${reasons.join(', ')}.`
    )
  }

  // Primero se elimina la fila de `image`. Si una clave foránea
  // (por ejemplo `page_image.imagen_id ON DELETE RESTRICT`) rechaza
  // el borrado, el archivo de Storage permanece intacto.
  const { data: deletedRows, error } = await supabase
    .from('image')
    .delete()
    .eq('id', imageId)
    .select('id')

  if (error) {
    if (error.code === '23503') {
      throw new Error(
        'No se puede eliminar: la imagen sigue vinculada a una página u otro elemento relacionado. El archivo no se ha borrado.'
      )
    }
    throw error
  }

  // Sin filas devueltas no se puede confirmar el borrado (no existe,
  // RLS lo impide o no había permisos): no se toca el Storage.
  if (!deletedRows || deletedRows.length === 0) {
    throw new Error(
      'No se pudo eliminar la imagen: no existe o no tienes permisos para borrarla. El archivo no se ha borrado.'
    )
  }

  // Solo cuando la fila se ha borrado de verdad se elimina el archivo
  // del Storage (best-effort). Si falla, la imagen ya no está en uso.
  try {
    const fileName = rutaStorage.split('/product-images/')[1]
    if (fileName) {
      const { error: storageError } = await supabase.storage
        .from('product-images')
        .remove([fileName])

      if (storageError) {
        console.error(
          'No se pudo borrar el archivo del storage:',
          storageError
        )
      }
    }
  } catch (err) {
    console.error('No se pudo borrar el archivo del storage:', err)
  }

  revalidatePath('/admin/images')
  revalidatePath('/galeria')
}