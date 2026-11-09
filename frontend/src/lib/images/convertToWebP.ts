import {
  ACCEPTED_INPUT_MIME_TYPES,
  MAX_DIMENSION,
  MAX_INPUT_BYTES,
  MAX_PIXELS,
  MAX_SOURCE_PIXELS,
  WEBP_MIME,
} from './config'
import { ImageProcessingError } from './errors'
import { toWebpFileName } from './fileName'
import { readImageDimensions } from './readDimensions'

type InputKind = (typeof ACCEPTED_INPUT_MIME_TYPES)[number]

export type ConversionResult = {
  originalName: string
  fileName: string
  blob: Blob
  /** Dimensiones finales del WebP (ya orientadas). */
  width: number
  height: number
  originalWidth: number
  originalHeight: number
  /** `false` cuando el archivo ya era un WebP válido y no se recomprimió. */
  converted: boolean
}

type LoadedImage = {
  source: CanvasImageSource
  dispose: () => void
}

function getExtension(name: string): string {
  const match = /\.([^.\\/]+)$/.exec(name)
  return match ? match[1].toLowerCase() : ''
}

function isBlockedType(file: File, extension: string): string | null {
  const type = file.type.toLowerCase()

  if (type === 'image/gif' || extension === 'gif') {
    return 'Los archivos GIF no están permitidos. Usa JPG, PNG o WebP.'
  }

  if (type === 'image/svg+xml' || extension === 'svg') {
    return 'Los archivos SVG no están permitidos. Usa JPG, PNG o WebP.'
  }

  if (
    type === 'image/heic' ||
    type === 'image/heif' ||
    extension === 'heic' ||
    extension === 'heif'
  ) {
    return 'Las imágenes HEIC/HEIF no son compatibles. Convierte el archivo a JPG o PNG antes de subirlo.'
  }

  if (type === 'image/avif' || extension === 'avif') {
    return 'Las imágenes AVIF no están permitidas en este flujo. Usa JPG, PNG o WebP.'
  }

  return null
}

/**
 * Devuelve el tipo de entrada normalizado o `null` si no está permitido.
 */
export function getInputKind(file: File): InputKind | null {
  const type = file.type.toLowerCase()
  const extension = getExtension(file.name)

  if (type === 'image/jpeg' || type === 'image/jpg' || type === 'image/pjpeg') {
    return 'image/jpeg'
  }
  if (type === 'image/png') return 'image/png'
  if (type === 'image/webp') return 'image/webp'

  // Algunos navegadores no rellenan `File.type` al arrastrar archivos.
  if (extension === 'jpg' || extension === 'jpeg') return 'image/jpeg'
  if (extension === 'png') return 'image/png'
  if (extension === 'webp') return 'image/webp'

  return null
}

export function isAcceptedImageFile(file: File): boolean {
  const extension = getExtension(file.name)
  return isBlockedType(file, extension) === null && getInputKind(file) !== null
}

/** Valida tipo y tamaño de un archivo antes de procesarlo. */
export function assertSupportedInput(file: File): InputKind {
  const extension = getExtension(file.name)
  const blockedReason = isBlockedType(file, extension)

  if (blockedReason) {
    throw new ImageProcessingError('UNSUPPORTED_TYPE', blockedReason, {
      fileName: file.name,
    })
  }

  if (file.size <= 0) {
    throw new ImageProcessingError(
      'EMPTY_FILE',
      `El archivo "${file.name}" está vacío.`,
      { fileName: file.name }
    )
  }

  if (file.size > MAX_INPUT_BYTES) {
    const megabytes = (file.size / (1024 * 1024)).toFixed(1)
    throw new ImageProcessingError(
      'FILE_TOO_LARGE',
      `"${file.name}" pesa ${megabytes} MB. El máximo por archivo es 25 MB.`,
      { fileName: file.name }
    )
  }

  const kind = getInputKind(file)

  if (!kind) {
    throw new ImageProcessingError(
      'UNSUPPORTED_TYPE',
      `El formato de "${file.name}" no está permitido. Usa JPG, PNG o WebP.`,
      { fileName: file.name }
    )
  }

  return kind
}

function clampQuality(quality: number | undefined): number {
  if (typeof quality !== 'number' || !Number.isFinite(quality)) return 0.92
  return Math.min(1, Math.max(0.1, quality))
}

function isWithinLimits(width: number, height: number): boolean {
  return (
    width > 0 &&
    height > 0 &&
    width <= MAX_DIMENSION &&
    height <= MAX_DIMENSION &&
    width * height <= MAX_PIXELS
  )
}

function fitWithinLimits(
  width: number,
  height: number
): { width: number; height: number } {
  if (isWithinLimits(width, height)) return { width, height }

  const scaleBySide = Math.min(1, MAX_DIMENSION / Math.max(width, height))
  const scaleByPixels = Math.min(1, Math.sqrt(MAX_PIXELS / (width * height)))
  const scale = Math.min(scaleBySide, scaleByPixels)

  return {
    width: Math.max(1, Math.floor(width * scale)),
    height: Math.max(1, Math.floor(height * scale)),
  }
}

/** Comprueba la firma real del contenedor WebP (`RIFF....WEBP`). */
export async function hasWebpSignature(blob: Blob): Promise<boolean> {
  if (blob.size < 12) return false

  const bytes = new Uint8Array(await blob.slice(0, 12).arrayBuffer())
  if (bytes.length < 12) return false

  return (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  )
}

async function loadImage(
  file: File,
  targetWidth: number,
  targetHeight: number,
  resize: boolean
): Promise<LoadedImage> {
  if (typeof createImageBitmap === 'function') {
    const options: ImageBitmapOptions = { imageOrientation: 'from-image' }

    if (resize) {
      options.resizeWidth = targetWidth
      options.resizeHeight = targetHeight
      options.resizeQuality = 'high'
    }

    try {
      const bitmap = await createImageBitmap(file, options)
      return {
        source: bitmap,
        dispose: () => bitmap.close(),
      }
    } catch {
      // Se recurre a <img> para navegadores sin soporte para estas opciones.
    }
  }

  const url = URL.createObjectURL(file)
  const image = new Image()

  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve()
      image.onerror = () => reject(new Error('No se pudo decodificar la imagen.'))
      image.src = url
    })

    return {
      source: image,
      dispose: () => URL.revokeObjectURL(url),
    }
  } catch (cause) {
    URL.revokeObjectURL(url)
    throw new ImageProcessingError(
      'DECODE_ERROR',
      `No se pudo decodificar "${file.name}". Comprueba que el archivo no esté dañado.`,
      { fileName: file.name, cause }
    )
  }
}

function canvasToWebp(
  canvas: HTMLCanvasElement,
  quality: number,
  fileName: string
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(
              new ImageProcessingError(
                'CANVAS_ERROR',
                `No se pudo generar el WebP de "${fileName}".`,
                { fileName }
              )
            )
            return
          }
          resolve(blob)
        },
        WEBP_MIME,
        quality
      )
    } catch (cause) {
      reject(
        new ImageProcessingError(
          'CANVAS_ERROR',
          `No se pudo generar el WebP de "${fileName}".`,
          { fileName, cause }
        )
      )
    }
  })
}

/**
 * Convierte JPEG/PNG a WebP en el navegador. Los WebP válidos que ya
 * cumplen los límites se devuelven sin recomprimir.
 */
export async function convertToWebP(
  file: File,
  quality?: number
): Promise<ConversionResult> {
  const inputKind = assertSupportedInput(file)
  const compressionQuality = clampQuality(quality)

  const dimensions = await readImageDimensions(file)
  const sourcePixels = dimensions.width * dimensions.height

  if (
    dimensions.width <= 0 ||
    dimensions.height <= 0 ||
    !Number.isFinite(sourcePixels)
  ) {
    throw new ImageProcessingError(
      'DIMENSIONS_UNREADABLE',
      `No se pudieron leer las dimensiones de "${file.name}".`,
      { fileName: file.name }
    )
  }

  if (sourcePixels > MAX_SOURCE_PIXELS) {
    throw new ImageProcessingError(
      'SOURCE_TOO_LARGE',
      `"${file.name}" tiene una resolución demasiado grande para procesarla de forma segura (máximo 100 MP).`,
      { fileName: file.name }
    )
  }

  const swapsOrientation =
    dimensions.orientation >= 5 && dimensions.orientation <= 8

  const orientedWidth = swapsOrientation
    ? dimensions.height
    : dimensions.width
  const orientedHeight = swapsOrientation
    ? dimensions.width
    : dimensions.height

  // Un WebP válido que ya cumple los límites no se recomprime.
  if (inputKind === 'image/webp' && isWithinLimits(orientedWidth, orientedHeight)) {
    if (!(await hasWebpSignature(file))) {
      throw new ImageProcessingError(
        'WEBP_INVALID',
        `"${file.name}" tiene extensión o tipo WebP, pero su contenido no es un WebP válido.`,
        { fileName: file.name }
      )
    }

    return {
      originalName: file.name,
      fileName: toWebpFileName(file.name),
      blob: file,
      width: orientedWidth,
      height: orientedHeight,
      originalWidth: orientedWidth,
      originalHeight: orientedHeight,
      converted: false,
    }
  }

  const target = fitWithinLimits(orientedWidth, orientedHeight)
  const needsResize =
    target.width !== orientedWidth || target.height !== orientedHeight

  const loaded = await loadImage(file, target.width, target.height, needsResize)

  try {
    const canvas = document.createElement('canvas')
    canvas.width = target.width
    canvas.height = target.height

    const context = canvas.getContext('2d')

    if (!context) {
      throw new ImageProcessingError(
        'CANVAS_ERROR',
        `No se pudo preparar el lienzo para convertir "${file.name}".`,
        { fileName: file.name }
      )
    }

    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = 'high'
    context.drawImage(loaded.source, 0, 0, target.width, target.height)

    const blob = await canvasToWebp(canvas, compressionQuality, file.name)

    if (blob.type !== WEBP_MIME) {
      throw new ImageProcessingError(
        'WEBP_UNSUPPORTED',
        'Este navegador no puede generar imágenes WebP. Prueba con una versión actualizada de Chrome, Edge, Firefox o Safari.',
        { fileName: file.name }
      )
    }

    if (!(await hasWebpSignature(blob))) {
      throw new ImageProcessingError(
        'WEBP_INVALID',
        `El archivo generado para "${file.name}" no es un WebP válido.`,
        { fileName: file.name }
      )
    }

    return {
      originalName: file.name,
      fileName: toWebpFileName(file.name),
      blob,
      width: target.width,
      height: target.height,
      originalWidth: orientedWidth,
      originalHeight: orientedHeight,
      converted: true,
    }
  } finally {
    loaded.dispose()
  }
}
