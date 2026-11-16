import { ImageProcessingError } from './errors'

export type ImageDimensions = {
  width: number
  height: number
  /**
   * Orientación EXIF (1-8). Solo se lee en JPEG; el resto de formatos
   * devuelve 1.
   */
  orientation: number
}

type ParsedDimensions = {
  format: 'jpeg' | 'png' | 'webp'
  width: number
  height: number
}

const MAX_HEADER_BYTES = 2 * 1024 * 1024

/**
 * Lee las dimensiones antes de decodificar la imagen completa. Para JPEG,
 * PNG y WebP se inspeccionan las cabeceras. Si no se pueden interpretar,
 * se recurre a una decodificación de solo lectura.
 */
export async function readImageDimensions(file: Blob): Promise<ImageDimensions> {
  const header = await file.slice(0, MAX_HEADER_BYTES).arrayBuffer()
  const bytes = new Uint8Array(header)
  const parsed = parseHeaderDimensions(bytes)

  if (parsed) {
    return {
      width: parsed.width,
      height: parsed.height,
      orientation: parsed.format === 'jpeg' ? readJpegOrientation(bytes) : 1,
    }
  }

  try {
    return await decodeDimensions(file)
  } catch (cause) {
    throw new ImageProcessingError(
      'DIMENSIONS_UNREADABLE',
      'No se pudieron leer las dimensiones de la imagen. El archivo puede estar dañado o no ser una imagen válida.',
      { cause }
    )
  }
}

function parseHeaderDimensions(bytes: Uint8Array): ParsedDimensions | null {
  return parsePng(bytes) ?? parseJpeg(bytes) ?? parseWebp(bytes)
}

function parsePng(bytes: Uint8Array): ParsedDimensions | null {
  if (bytes.length < 24) return null

  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
  if (!signature.every((value, index) => bytes[index] === value)) return null

  // El primer chunk debe ser IHDR: longitud (4) + tipo (4) + ancho/alto (8).
  const width = readUint32BE(bytes, 16)
  const height = readUint32BE(bytes, 20)

  if (width <= 0 || height <= 0) return null
  return { format: 'png', width, height }
}

function isSofMarker(marker: number): boolean {
  return (
    marker >= 0xc0 &&
    marker <= 0xcf &&
    marker !== 0xc4 &&
    marker !== 0xc8 &&
    marker !== 0xcc
  )
}

function parseJpeg(bytes: Uint8Array): ParsedDimensions | null {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    return null
  }

  let offset = 2

  while (offset + 3 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1
      continue
    }

    const marker = bytes[offset + 1]

    if (marker === 0xff) {
      offset += 1
      continue
    }

    // Marcadores sin longitud.
    if (
      marker === 0xd8 ||
      marker === 0xd9 ||
      marker === 0x01 ||
      (marker >= 0xd0 && marker <= 0xd7)
    ) {
      offset += 2
      continue
    }

    if (marker === 0xda) break

    const segmentLength = (bytes[offset + 2] << 8) | bytes[offset + 3]
    if (segmentLength < 2) break

    if (isSofMarker(marker)) {
      if (offset + 8 >= bytes.length) break

      const height = (bytes[offset + 5] << 8) | bytes[offset + 6]
      const width = (bytes[offset + 7] << 8) | bytes[offset + 8]

      if (width <= 0 || height <= 0) return null
      return { format: 'jpeg', width, height }
    }

    offset += 2 + segmentLength
  }

  return null
}

function parseWebp(bytes: Uint8Array): ParsedDimensions | null {
  if (bytes.length < 30) return null
  if (readAscii(bytes, 0, 4) !== 'RIFF' || readAscii(bytes, 8, 4) !== 'WEBP') {
    return null
  }

  const chunk = readAscii(bytes, 12, 4)

  if (chunk === 'VP8X') {
    const width = 1 + readUint24LE(bytes, 24)
    const height = 1 + readUint24LE(bytes, 27)
    if (width <= 0 || height <= 0) return null
    return { format: 'webp', width, height }
  }

  if (chunk === 'VP8 ') {
    if (
      bytes[23] !== 0x9d ||
      bytes[24] !== 0x01 ||
      bytes[25] !== 0x2a
    ) {
      return null
    }

    const width = readUint16LE(bytes, 26) & 0x3fff
    const height = readUint16LE(bytes, 28) & 0x3fff
    if (width <= 0 || height <= 0) return null
    return { format: 'webp', width, height }
  }

  if (chunk === 'VP8L') {
    if (bytes[20] !== 0x2f) return null

    const bits = readUint32LE(bytes, 21)
    const width = (bits & 0x3fff) + 1
    const height = ((bits >>> 14) & 0x3fff) + 1
    if (width <= 0 || height <= 0) return null
    return { format: 'webp', width, height }
  }

  return null
}

function readJpegOrientation(bytes: Uint8Array): number {
  let offset = 2

  while (offset + 4 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1
      continue
    }

    const marker = bytes[offset + 1]

    if (marker === 0xff) {
      offset += 1
      continue
    }

    if (
      marker === 0xd8 ||
      marker === 0xd9 ||
      marker === 0x01 ||
      (marker >= 0xd0 && marker <= 0xd7)
    ) {
      offset += 2
      continue
    }

    if (marker === 0xda) break

    const segmentLength = (bytes[offset + 2] << 8) | bytes[offset + 3]
    if (segmentLength < 2) break

    if (marker === 0xe1) {
      const start = offset + 4
      const end = Math.min(offset + 2 + segmentLength, bytes.length)
      const orientation = parseExifOrientation(bytes, start, end)
      if (orientation !== null) return orientation
    }

    offset += 2 + segmentLength
  }

  return 1
}

function parseExifOrientation(
  bytes: Uint8Array,
  start: number,
  end: number
): number | null {
  if (start + 6 > end) return null
  if (readAscii(bytes, start, 6) !== 'Exif\0\0') return null

  const tiff = start + 6
  if (tiff + 8 > end) return null

  const byteOrder = readAscii(bytes, tiff, 2)
  const littleEndian = byteOrder === 'II'

  if (!littleEndian && byteOrder !== 'MM') return null

  const read16 = (position: number) =>
    littleEndian ? readUint16LE(bytes, position) : readUint16BE(bytes, position)
  const read32 = (position: number) =>
    littleEndian ? readUint32LE(bytes, position) : readUint32BE(bytes, position)

  if (read16(tiff + 2) !== 0x002a) return null

  const ifdOffset = read32(tiff + 4)
  const ifd = tiff + ifdOffset
  if (ifd + 2 > end) return null

  const entries = read16(ifd)
  if (entries <= 0 || entries > 512) return null

  for (let index = 0; index < entries; index += 1) {
    const entry = ifd + 2 + index * 12
    if (entry + 12 > end) return null

    const tag = read16(entry)
    if (tag !== 0x0112) continue

    const type = read16(entry + 2)
    const count = read32(entry + 4)
    if (type !== 3 || count !== 1) return 1

    const value = read16(entry + 8)
    return value >= 1 && value <= 8 ? value : 1
  }

  return null
}

async function decodeDimensions(file: Blob): Promise<ImageDimensions> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file, {
        imageOrientation: 'from-image',
      })
      const dimensions = {
        width: bitmap.width,
        height: bitmap.height,
        orientation: 1,
      }
      bitmap.close()
      return dimensions
    } catch {
      // Se intenta el método alternativo con <img>.
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
      width: image.naturalWidth,
      height: image.naturalHeight,
      orientation: 1,
    }
  } finally {
    URL.revokeObjectURL(url)
  }
}

function readAscii(bytes: Uint8Array, offset: number, length: number): string {
  let result = ''
  for (let index = 0; index < length; index += 1) {
    const value = bytes[offset + index]
    if (value === undefined) return result
    result += String.fromCharCode(value)
  }
  return result
}

function readUint16BE(bytes: Uint8Array, offset: number): number {
  return (bytes[offset] << 8) | bytes[offset + 1]
}

function readUint16LE(bytes: Uint8Array, offset: number): number {
  return bytes[offset] | (bytes[offset + 1] << 8)
}

function readUint24LE(bytes: Uint8Array, offset: number): number {
  return bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16)
}

function readUint32BE(bytes: Uint8Array, offset: number): number {
  return (
    ((bytes[offset] << 24) |
      (bytes[offset + 1] << 16) |
      (bytes[offset + 2] << 8) |
      bytes[offset + 3]) >>>
    0
  )
}

function readUint32LE(bytes: Uint8Array, offset: number): number {
  return (
    (bytes[offset] |
      (bytes[offset + 1] << 8) |
      (bytes[offset + 2] << 16) |
      (bytes[offset + 3] << 24)) >>>
    0
  )
}
