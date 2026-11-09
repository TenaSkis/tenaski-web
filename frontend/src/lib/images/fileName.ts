const UNSAFE_CHARS = /[^\w.-]+/g
const MAX_BASE_LENGTH = 80

function stripExtension(name: string): string {
  return name.replace(/\.[^./\\]+$/, '')
}

function lastPathSegment(name: string): string {
  const parts = name.split(/[\\/]/)
  return parts[parts.length - 1] || 'imagen'
}

/**
 * Obtiene un nombre base seguro (sin extensión, sin rutas) a partir del
 * nombre original del archivo.
 */
export function getBaseName(originalName: string): string {
  const segment = lastPathSegment(originalName)
  const withoutExtension = stripExtension(segment)

  const normalized = withoutExtension
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(UNSAFE_CHARS, '-')
    .replace(/^-+|-+$/g, '')

  return normalized.slice(0, MAX_BASE_LENGTH) || 'imagen'
}

/** Nombre visible que se guardará en `image.nombre_archivo`. */
export function toWebpFileName(originalName: string): string {
  return `${getBaseName(originalName)}.webp`
}

/**
 * Clave única dentro del bucket. No se reutiliza ninguna clave existente.
 */
export function createStorageKey(): string {
  const randomPart =
    typeof globalThis.crypto?.randomUUID === 'function'
      ? globalThis.crypto.randomUUID()
      : `${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`

  return `${Date.now()}-${randomPart}.webp`
}
