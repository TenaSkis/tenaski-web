/**
 * Configuración compartida para la conversión y subida de imágenes
 * administrativas.
 *
 * Estos límites se aplican en el navegador, antes de enviar nada a
 * Supabase. No sustituyen ni modifican la configuración del bucket.
 */

export const IMAGE_BUCKET = 'product-images'
export const WEBP_MIME = 'image/webp'

/** Calidad de compresión para productos y galería. */
export const QUALITY_PRODUCT = 0.92

/** Calidad de compresión para imágenes de contenido. */
export const QUALITY_CONTENT = 0.95

/** Lado mayor máximo del WebP resultante. */
export const MAX_DIMENSION = 4096

/** Píxeles máximos del WebP resultante (24 MP). */
export const MAX_PIXELS = 24_000_000

/** Tamaño máximo del archivo de entrada (25 MB). */
export const MAX_INPUT_BYTES = 25 * 1024 * 1024

/** Número máximo de archivos por lote. */
export const MAX_BATCH_FILES = 20

/** Tamaño máximo acumulado de entrada por lote (100 MB). */
export const MAX_BATCH_INPUT_BYTES = 100 * 1024 * 1024

/** Tamaño máximo acumulado del WebP resultante por lote (40 MB). */
export const MAX_BATCH_OUTPUT_BYTES = 40 * 1024 * 1024

/**
 * Límite de seguridad para evitar intentar decodificar imágenes
 * desproporcionadamente grandes. Por encima de este valor se rechaza
 * el archivo en lugar de arriesgar un bloqueo del navegador.
 */
export const MAX_SOURCE_PIXELS = 100_000_000

/**
 * Tipos aceptados como entrada. GIF, SVG, HEIC/HEIF y AVIF quedan
 * fuera de forma explícita.
 */
export const ACCEPTED_INPUT_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const

/** Valor para el atributo `accept` de los inputs de archivo. */
export const ACCEPT_ATTRIBUTE = 'image/jpeg,image/png,image/webp'
