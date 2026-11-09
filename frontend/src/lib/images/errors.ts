export type ImageErrorCode =
  | 'NOT_AUTHENTICATED'
  | 'UNSUPPORTED_TYPE'
  | 'EMPTY_FILE'
  | 'FILE_TOO_LARGE'
  | 'TOO_MANY_FILES'
  | 'BATCH_INPUT_TOO_LARGE'
  | 'BATCH_OUTPUT_TOO_LARGE'
  | 'SOURCE_TOO_LARGE'
  | 'DIMENSIONS_UNREADABLE'
  | 'DECODE_ERROR'
  | 'CANVAS_ERROR'
  | 'WEBP_UNSUPPORTED'
  | 'WEBP_INVALID'
  | 'UPLOAD_FAILED'
  | 'BUCKET_REJECTED_WEBP'
  | 'DB_INSERT_FAILED'

type ImageErrorOptions = {
  fileName?: string
  cause?: unknown
}

/**
 * Error controlado del procesamiento de imágenes. El mensaje está pensado
 * para mostrarse al usuario y nunca incluye credenciales ni secretos.
 */
export class ImageProcessingError extends Error {
  readonly code: ImageErrorCode
  readonly fileName?: string
  readonly originalError?: unknown

  constructor(code: ImageErrorCode, message: string, options?: ImageErrorOptions) {
    super(message)
    this.name = 'ImageProcessingError'
    this.code = code
    this.fileName = options?.fileName
    this.originalError = options?.cause
  }
}

export function getImageErrorMessage(error: unknown): string {
  if (error instanceof ImageProcessingError) return error.message
  if (error instanceof Error && error.message) return error.message
  return 'No se pudo procesar la imagen. Inténtalo de nuevo.'
}

/**
 * Devuelve el texto del aviso visual para errores de formato no admitido.
 * Para cualquier otro error devuelve `null`, de modo que el flujo existente
 * siga encargándose de él sin cambios.
 */
export function getUnsupportedFormatMessage(error: unknown): string | null {
  if (
    !(error instanceof ImageProcessingError) ||
    error.code !== 'UNSUPPORTED_TYPE'
  ) {
    return null
  }

  const fileName = error.fileName
    ? `"${error.fileName}"`
    : 'El archivo seleccionado'

  return `${fileName} no tiene un formato admitido. Formatos permitidos: JPG, JPEG, PNG y WebP.`
}

