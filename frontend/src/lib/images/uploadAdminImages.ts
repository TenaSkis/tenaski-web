import type { SupabaseClient } from '@supabase/supabase-js'

import { supabase } from '@/lib/supabase/client'

import {
  IMAGE_BUCKET,
  MAX_BATCH_FILES,
  MAX_BATCH_INPUT_BYTES,
  MAX_BATCH_OUTPUT_BYTES,
  MAX_INPUT_BYTES,
  QUALITY_PRODUCT,
  WEBP_MIME,
} from './config'
import {
  assertSupportedInput,
  convertToWebP,
  type ConversionResult,
} from './convertToWebP'
import { ImageProcessingError } from './errors'
import { createStorageKey, toWebpFileName } from './fileName'

export type AdminImagesClient = SupabaseClient

export type AdminUploadProgress = {
  phase: 'converting' | 'uploading'
  /** Índice 1-based del archivo que se está procesando. */
  current: number
  total: number
  fileName: string
}

export type UploadedAdminImage = {
  id: string
  nombre_archivo: string
  ruta_storage: string
  originalName: string
}

type UploadAdminImagesOptions = {
  files: File[] | FileList
  userId: string
  quality?: number
  client?: AdminImagesClient
  onProgress?: (progress: AdminUploadProgress) => void
}

type PendingRow = {
  key: string
  nombre_archivo: string
  ruta_storage: string
  uploaded_by: string
}

/**
 * Valida el lote completo antes de convertir o subir nada.
 */
export function validateAdminImageBatch(files: File[] | FileList): void {
  const items = Array.from(files)

  if (items.length > MAX_BATCH_FILES) {
    throw new ImageProcessingError(
      'TOO_MANY_FILES',
      `Puedes subir como máximo ${MAX_BATCH_FILES} imágenes a la vez.`
    )
  }

  let totalBytes = 0

  for (const file of items) {
    assertSupportedInput(file)
    totalBytes += file.size
  }

  if (totalBytes > MAX_BATCH_INPUT_BYTES) {
    throw new ImageProcessingError(
      'BATCH_INPUT_TOO_LARGE',
      'El lote supera los 100 MB de entrada. Reduce el número o el tamaño de las imágenes.'
    )
  }
}

function wrapUploadError(
  error: { message?: string } | null,
  fileName: string
): ImageProcessingError {
  const message = error?.message ?? 'Error desconocido del almacenamiento'

  if (/(mime|content.?type|not supported|invalid.*type)/i.test(message)) {
    return new ImageProcessingError(
      'BUCKET_REJECTED_WEBP',
      `El almacenamiento ha rechazado el WebP de "${fileName}". No se ha modificado la configuración del bucket. Detalle: ${message}`,
      { fileName }
    )
  }

  return new ImageProcessingError(
    'UPLOAD_FAILED',
    `No se pudo subir "${fileName}" como WebP: ${message}`,
    { fileName }
  )
}

async function removeUploadedObjects(
  client: AdminImagesClient,
  keys: string[]
): Promise<void> {
  if (keys.length === 0) return

  try {
    const { error } = await client.storage.from(IMAGE_BUCKET).remove(keys)
    if (error) {
      console.error(
        'No se pudieron limpiar todos los archivos subidos:',
        error.message
      )
    }
  } catch (error) {
    console.error('No se pudieron limpiar todos los archivos subidos:', error)
  }
}

async function removeInsertedRows(
  client: AdminImagesClient,
  urls: string[]
): Promise<void> {
  if (urls.length === 0) return

  try {
    const { error } = await client
      .from('image')
      .delete()
      .in('ruta_storage', urls)

    if (error) {
      console.error(
        'No se pudieron limpiar todas las filas insertadas:',
        error.message
      )
    }
  } catch (error) {
    console.error('No se pudieron limpiar todas las filas insertadas:', error)
  }
}

/**
 * Convierte todo el lote a WebP, sube únicamente el resultado y registra
 * las filas de `image` en una sola inserción.
 *
 * Si falla una conversión, no se sube nada. Si falla una subida o la
 * inserción, se eliminan los objetos creados por esta operación.
 */
export async function uploadAdminImages({
  files,
  userId,
  quality = QUALITY_PRODUCT,
  client = supabase,
  onProgress,
}: UploadAdminImagesOptions): Promise<UploadedAdminImage[]> {
  if (!userId) {
    throw new ImageProcessingError(
      'NOT_AUTHENTICATED',
      'No hay sesión activa. Vuelve a iniciar sesión.'
    )
  }

  const items = Array.from(files)
  if (items.length === 0) return []

  validateAdminImageBatch(items)

  // 1. Convertir todo el lote antes de empezar a subir.
  const converted: ConversionResult[] = []

  for (let index = 0; index < items.length; index += 1) {
    onProgress?.({
      phase: 'converting',
      current: index + 1,
      total: items.length,
      fileName: items[index].name,
    })

    converted.push(await convertToWebP(items[index], quality))
  }

  const totalOutputBytes = converted.reduce(
    (total, item) => total + item.blob.size,
    0
  )

  for (const item of converted) {
    if (item.blob.size > MAX_INPUT_BYTES) {
      const megabytes = (item.blob.size / (1024 * 1024)).toFixed(1)
      throw new ImageProcessingError(
        'FILE_TOO_LARGE',
        `El WebP resultante de "${item.originalName}" pesa ${megabytes} MB. El máximo por archivo es 25 MB.`,
        { fileName: item.originalName }
      )
    }
  }

  if (totalOutputBytes > MAX_BATCH_OUTPUT_BYTES) {
    throw new ImageProcessingError(
      'BATCH_OUTPUT_TOO_LARGE',
      'El WebP resultante supera los 40 MB. Reduce el número o el tamaño de las imágenes.'
    )
  }

  // 2. Subir secuencialmente y preparar las filas.
  const bucket = client.storage.from(IMAGE_BUCKET)
  const uploadedKeys: string[] = []
  let rowsInserted = false

  const rows: PendingRow[] = converted.map((item) => ({
    key: createStorageKey(),
    nombre_archivo: toWebpFileName(item.originalName),
    ruta_storage: '',
    uploaded_by: userId,
  }))

  try {
    for (let index = 0; index < converted.length; index += 1) {
      onProgress?.({
        phase: 'uploading',
        current: index + 1,
        total: converted.length,
        fileName: converted[index].originalName,
      })

      const { error } = await bucket.upload(rows[index].key, converted[index].blob, {
        contentType: WEBP_MIME,
        upsert: false,
      })

      if (error) {
        throw wrapUploadError(error, converted[index].originalName)
      }

      uploadedKeys.push(rows[index].key)
      rows[index].ruta_storage = bucket.getPublicUrl(rows[index].key).data.publicUrl
    }

    // 3. Una única inserción para no dejar filas parciales.
    const { data, error } = await client
      .from('image')
      .insert(
        rows.map((row) => ({
          nombre_archivo: row.nombre_archivo,
          ruta_storage: row.ruta_storage,
          uploaded_by: row.uploaded_by,
        }))
      )
      .select('id, nombre_archivo, ruta_storage')

    if (error) {
      throw new ImageProcessingError(
        'DB_INSERT_FAILED',
        `No se pudieron registrar las imágenes en la base de datos: ${error.message}`,
        { cause: error }
      )
    }

    rowsInserted = true

    const inserted = data ?? []
    const byUrl = new Map(
      inserted.map((row) => [row.ruta_storage, row] as const)
    )

    const missingRow = rows.some((row) => !byUrl.has(row.ruta_storage))

    if (inserted.length !== rows.length || missingRow) {
      throw new ImageProcessingError(
        'DB_INSERT_FAILED',
        'No se pudieron registrar todas las imágenes en la base de datos.'
      )
    }

    return rows.map((row, index) => {
      const insertedRow = byUrl.get(row.ruta_storage)

      if (!insertedRow) {
        // Cubierto por la comprobación anterior; se mantiene para tipar.
        throw new ImageProcessingError(
          'DB_INSERT_FAILED',
          'No se pudo asociar una imagen insertada con su archivo.'
        )
      }

      return {
        id: insertedRow.id,
        nombre_archivo: insertedRow.nombre_archivo,
        ruta_storage: insertedRow.ruta_storage,
        originalName: converted[index].originalName,
      }
    })
  } catch (error) {
    if (rowsInserted) {
      await removeInsertedRows(
        client,
        rows.map((row) => row.ruta_storage)
      )
    }

    await removeUploadedObjects(client, uploadedKeys)
    throw error
  }
}
