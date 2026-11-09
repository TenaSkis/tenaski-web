import { supabase } from '@/lib/supabase/client'

import { IMAGE_BUCKET } from './config'
import type { AdminImagesClient } from './uploadAdminImages'

export type CleanupResult = {
  deleted: string[]
  skipped: Array<{ id: string; reason: string }>
  failed: Array<{ id: string; reason: string }>
}

type ReferenceCheck = {
  table: 'product_image' | 'page_image' | 'content_block' | 'acabado'
  label: string
}

const REFERENCE_CHECKS: ReferenceCheck[] = [
  { table: 'product_image', label: 'productos' },
  { table: 'page_image', label: 'páginas' },
  { table: 'content_block', label: 'contenido' },
  { table: 'acabado', label: 'acabados' },
]

function storageKeyFromUrl(url: string): string | null {
  const marker = `/${IMAGE_BUCKET}/`
  const index = url.indexOf(marker)
  if (index === -1) return null

  const rawKey = url
    .slice(index + marker.length)
    .split('?')[0]
    .split('#')[0]

  if (!rawKey) return null

  try {
    return decodeURIComponent(rawKey)
  } catch {
    return rawKey
  }
}

/**
 * Comprueba si una imagen está referenciada en cualquier parte. Si no se
 * puede confirmar, se considera que no debe borrarse.
 */
async function findBlockingReference(
  client: AdminImagesClient,
  imageId: string
): Promise<
  | { blockedBy: string[]; error?: undefined }
  | { blockedBy?: undefined; error: string }
> {
  const results = await Promise.all(
    REFERENCE_CHECKS.map(async (check) => {
      const { count, error } = await client
        .from(check.table)
        .select('*', { count: 'exact', head: true })
        .eq('imagen_id', imageId)

      return { ...check, count: count ?? 0, error }
    })
  )

  const failed = results.filter((result) => result.error)
  if (failed.length > 0) {
    return {
      error: failed
        .map((result) => `${result.label}: ${result.error?.message ?? 'error'}`)
        .join('; '),
    }
  }

  const blockedBy = results
    .filter((result) => result.count > 0)
    .map((result) => result.label)

  return { blockedBy }
}

/**
 * Limpia únicamente las imágenes creadas por una operación administrativa.
 * Antes de borrar comprueba:
 * - que la fila siga existiendo;
 * - que no esté en la galería;
 * - que no esté referenciada en product_image, page_image, content_block
 *   ni acabado.
 *
 * Si cualquiera de las comprobaciones falla, no se borra nada.
 */
export async function cleanupAdminImages(
  imageIds: string[],
  client: AdminImagesClient = supabase
): Promise<CleanupResult> {
  const result: CleanupResult = {
    deleted: [],
    skipped: [],
    failed: [],
  }

  const uniqueIds = Array.from(new Set(imageIds.filter(Boolean)))

  for (const imageId of uniqueIds) {
    const { data: image, error: imageError } = await client
      .from('image')
      .select('id, ruta_storage, en_galeria')
      .eq('id', imageId)
      .maybeSingle()

    if (imageError) {
      result.failed.push({
        id: imageId,
        reason: `No se pudo comprobar la imagen: ${imageError.message}`,
      })
      continue
    }

    if (!image) {
      result.skipped.push({
        id: imageId,
        reason: 'La fila ya no existe.',
      })
      continue
    }

    if (image.en_galeria) {
      result.skipped.push({
        id: imageId,
        reason: 'La imagen está marcada para la galería.',
      })
      continue
    }

    const references = await findBlockingReference(client, imageId)

    if (references.error !== undefined) {
      result.failed.push({
        id: imageId,
        reason: `No se pudo confirmar si la imagen está en uso (${references.error}).`,
      })
      continue
    }

    if (references.blockedBy && references.blockedBy.length > 0) {
      result.skipped.push({
        id: imageId,
        reason: `La imagen está en uso en: ${references.blockedBy.join(', ')}.`,
      })
      continue
    }

    const storageKey = storageKeyFromUrl(image.ruta_storage)

    if (!storageKey) {
      result.failed.push({
        id: imageId,
        reason: 'No se pudo determinar la clave del archivo en Storage.',
      })
      continue
    }

    // Primero se elimina la fila para no dejar una fila huérfana.
    const { error: deleteError } = await client
      .from('image')
      .delete()
      .eq('id', imageId)

    if (deleteError) {
      result.failed.push({
        id: imageId,
        reason: `No se pudo eliminar la fila: ${deleteError.message}`,
      })
      continue
    }

    // El archivo se elimina después, en modo best-effort.
    try {
      const { error: storageError } = await client.storage
        .from(IMAGE_BUCKET)
        .remove([storageKey])

      if (storageError) {
        result.failed.push({
          id: imageId,
          reason: `Fila eliminada, pero no se pudo borrar el archivo: ${storageError.message}`,
        })
        continue
      }
    } catch (error) {
      result.failed.push({
        id: imageId,
        reason: `Fila eliminada, pero no se pudo borrar el archivo: ${
          error instanceof Error ? error.message : 'error desconocido'
        }`,
      })
      continue
    }

    result.deleted.push(imageId)
  }

  return result
}
