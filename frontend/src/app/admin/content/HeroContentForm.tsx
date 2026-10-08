'use client'

// app/admin/content/HeroContentForm.tsx
//
// Client Component: aquí SÍ hay interactividad (escribir en inputs, elegir
// una imagen, hacer click en Guardar), por eso necesita 'use client'.
// Llama a la server action updateContentBlock cuando se envía el formulario.

import { useEffect, useRef, useState, useTransition } from 'react'
import Image from 'next/image'
import { updateContentBlock } from './actions'
import UploadContentImage from './UploadContentImage'
import Hero from '@/components/home/Hero'

// ── Tipos ────────────────────────────────────────────────────────────────────

type ImageRow = {
  id: string
  ruta_storage: string
  nombre_archivo: string
}

// La relación `image` embebida puede venir como objeto (FK muchos-a-uno,
// caso normal en Postgres/PostgREST) o como array (según cómo la tipe
// Supabase). Contemplamos ambos casos con un tipo reutilizable.
type ImageRelation =
  | { id: string; ruta_storage: string }
  | { id: string; ruta_storage: string }[]
  | null
  | undefined

type HeroBlock = {
  id: string
  seccion: string
  data: { eyebrow?: string; titulo?: string; descripcion?: string }
  imagen_id: string | null
  image: ImageRelation
} | null

type Props = {
  block: HeroBlock
  imageLibrary: ImageRow[]
  seccion: string
  titulo: string
}

// ─────────────────────────────────────────────
// HELPER: extrae ruta_storage sea objeto o array
// ─────────────────────────────────────────────
function getImage(img: ImageRelation): string | null {
  if (!img) return null
  if (Array.isArray(img)) return img[0]?.ruta_storage ?? null
  return img.ruta_storage ?? null
}

// ─────────────────────────────────────────────
// LÍMITES DE LONGITUD
//
// `max` es un tope duro de tecleo: el navegador no deja escribir más.
// NO recorta ni borra lo que ya está guardado, así que el texto actual
// del cliente no se ve afectado (lo más largo que hay hoy son 24 / 46 /
// 80 caracteres, muy por debajo de estos topes).
//
// `aviso` es más bajo que `max` a propósito: es el umbral de "esto ya
// apretará el Hero en pantallas pequeñas", no un límite.
//
// Ojo: `maxLength` es solo una restricción del navegador. No valida nada
// al guardar ni protege la base de datos — quien escriba por otro lado
// (panel de Supabase, un script) puede guardar más. Lo que garantiza que
// el Hero no se rompe es siempre el auto-ajuste del título.
// ─────────────────────────────────────────────
const LIMITES = {
  eyebrow: { max: 40, aviso: 30 },
  titulo: { max: 90, aviso: 60 },
  descripcion: { max: 200, aviso: 130 },
}

/** Contador de caracteres. Avisa, pero nunca bloquea el guardado. */
function CharCount({
  value,
  aviso,
  max,
}: {
  value: string
  aviso: number
  max: number
}) {
  const length = value.trim().length
  const excedido = length > aviso

  return (
    <span
      className={`text-xs tabular-nums ${excedido ? 'text-amber-400' : 'text-zinc-500'}`}
    >
      {length}/{max}
    </span>
  )
}

// ─────────────────────────────────────────────
// VISTA PREVIA
//
// Renderiza el Hero REAL dentro de un lienzo de 1280×720 reducido con
// transform. Al ser un tamaño de escritorio real, el presupuesto de
// altura es exactamente el mismo que verá el visitante, así que lo que
// se ve aquí es lo que se ve en la web.
// ─────────────────────────────────────────────
const PREVIEW_ANCHO = 1280
const PREVIEW_ALTO = 720

type PreviewProps = {
  eyebrow: string
  title: string
  description: string
  imageUrl: string | null
}

function HeroPreview({ eyebrow, title, description, imageUrl }: PreviewProps) {
  const boxRef = useRef<HTMLDivElement | null>(null)
  const [scale, setScale] = useState(0.25)

  // El lienzo es fijo (1280px) y se encoge para caber en la caja del
  // panel, así que el factor depende del ancho disponible.
  useEffect(() => {
    const box = boxRef.current
    if (!box) return

    const update = () => setScale(box.clientWidth / PREVIEW_ANCHO)
    update()

    const observer = new ResizeObserver(update)
    observer.observe(box)

    return () => observer.disconnect()
  }, [])

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-medium text-zinc-300">Vista previa</p>
        <p className="text-xs text-zinc-500">Escritorio · 1280 × 720</p>
      </div>

      <div
        ref={boxRef}
        className="relative w-full overflow-hidden rounded-lg border border-zinc-700 bg-zinc-950"
        style={{ aspectRatio: `${PREVIEW_ANCHO} / ${PREVIEW_ALTO}` }}
      >
        {/* pointer-events-none: los botones del Hero son enlaces reales y
            no queremos que se navegue al hacer clic en la vista previa. */}
        <div
          className="pointer-events-none absolute left-0 top-0 origin-top-left"
          style={{
            width: PREVIEW_ANCHO,
            height: PREVIEW_ALTO,
            transform: `scale(${scale})`,
          }}
        >
          <Hero
            preview
            imageUrl={imageUrl ?? undefined}
            eyebrow={eyebrow}
            title={title}
            description={description}
            buttons={[
              { text: 'Ver catálogo', href: '/catalogo', variant: 'primary' },
              { text: 'Nuestra historia', href: '/historia', variant: 'secondary' },
            ]}
          />
        </div>
      </div>

      <p className="mt-2 text-xs text-zinc-500">
        Solo el título cambia de tamaño: si es largo se encoge por pasos hasta
        que la cabecera entra en la pantalla. El eyebrow y la descripción
        mantienen siempre su tamaño. El contador se pone en ámbar cuando el
        texto empieza a apretar en pantallas pequeñas.
      </p>
    </div>
  )
}

export default function HeroContentForm({
  block,
  imageLibrary,
  seccion,
  titulo,
}: Props) {
  // Estado local del formulario, inicializado con lo que ya hay guardado
  const [eyebrow, setEyebrow] = useState(block?.data?.eyebrow ?? '')
  const [tituloHero, setTituloHero] = useState(block?.data?.titulo ?? '')
  const [descripcion, setDescripcion] = useState(block?.data?.descripcion ?? '')
  const [selectedImageId, setSelectedImageId] = useState<string | null>(
    block?.imagen_id ?? null
  )
  const [uploadedPreview, setUploadedPreview] = useState<{ id: string; ruta_storage: string } | null>(null)

  // useTransition nos da un estado "isPending" para deshabilitar el botón
  // mientras se guarda, sin tener que manejarlo a mano.
  const [isPending, startTransition] = useTransition()
  const [savedMessage, setSavedMessage] = useState(false)

  // Imagen actual (soporta que `image` venga como objeto o como array)
  const currentImage = getImage(block?.image)
  const previewImage =
    selectedImageId && uploadedPreview?.id === selectedImageId
      ? uploadedPreview.ruta_storage
      : currentImage

  function handleSave() {
    startTransition(async () => {
      await updateContentBlock(
        seccion,
        {
          eyebrow,
          titulo: tituloHero,
          descripcion,
        },
        selectedImageId
      )
      setSavedMessage(true)
      setTimeout(() => setSavedMessage(false), 2500)
    })
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">

      <h2 className="text-xl font-semibold">{titulo}</h2>
      <p className="mt-1 text-sm text-zinc-400">
        Edita el contenido de la cabecera de esta página.
      </p>

      <div className="mt-6 grid gap-8 md:grid-cols-2">

        {/* ── COLUMNA IZQUIERDA: TEXTOS ────────────────────────────────── */}
        <div className="space-y-5">

          <div>
            <div className="mb-1.5 flex items-baseline justify-between gap-3">
              <label className="block text-sm font-medium text-zinc-300">
                Eyebrow (etiqueta superior)
              </label>
              <CharCount
                value={eyebrow}
                aviso={LIMITES.eyebrow.aviso}
                max={LIMITES.eyebrow.max}
              />
            </div>
            <input
              type="text"
              value={eyebrow}
              maxLength={LIMITES.eyebrow.max}
              onChange={(e) => setEyebrow(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-[#E8E4DC] outline-none focus:border-[#C4A882]"
            />
          </div>

          <div>
            <div className="mb-1.5 flex items-baseline justify-between gap-3">
              <label className="block text-sm font-medium text-zinc-300">
                Título
              </label>
              <CharCount
                value={tituloHero}
                aviso={LIMITES.titulo.aviso}
                max={LIMITES.titulo.max}
              />
            </div>
            <input
              type="text"
              value={tituloHero}
              maxLength={LIMITES.titulo.max}
              onChange={(e) => setTituloHero(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-[#E8E4DC] outline-none focus:border-[#C4A882]"
            />
          </div>

          <div>
            <div className="mb-1.5 flex items-baseline justify-between gap-3">
              <label className="block text-sm font-medium text-zinc-300">
                Descripción
              </label>
              <CharCount
                value={descripcion}
                aviso={LIMITES.descripcion.aviso}
                max={LIMITES.descripcion.max}
              />
            </div>
            <textarea
              value={descripcion}
              maxLength={LIMITES.descripcion.max}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={4}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-[#E8E4DC] outline-none focus:border-[#C4A882] resize-none"
            />
          </div>

        </div>

        {/* ── IMAGEN ─────────────────────────────────── */}
        <div className="space-y-4">
          <label className="block text-sm font-medium text-zinc-300">
            Imagen de la Cabecera
          </label>
          {/* Preview */}
          <div className="relative h-48 w-full overflow-hidden rounded-lg border border-zinc-700 bg-zinc-800">
            {previewImage ? (
              <Image
                src={previewImage}
                alt="Hero image"
                fill
                className="object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-zinc-500">
                Sin imagen
              </div>
            )}
          </div>
          {/* SOLO SUBIDA */}
          <UploadContentImage
            onUploaded={(imageId, ruta) => {
              setSelectedImageId(imageId)
              setUploadedPreview({ id: imageId, ruta_storage: ruta })
            }}
          />
          <p className="text-xs text-zinc-500">
            La imagen subida se guardará automáticamente como imagen de la cabecera.
          </p>
        </div>

      </div>

      {/* ── VISTA PREVIA DE LA CABECERA ─────────────────────────────────── */}
      <div className="mt-8 border-t border-zinc-800 pt-6">
        <HeroPreview
          eyebrow={eyebrow}
          title={tituloHero}
          description={descripcion}
          imageUrl={previewImage}
        />
      </div>

      {/* ── GUARDAR ──────────────────────────────────────────────────────── */}
      <div className="mt-8 flex items-center gap-4 border-t border-zinc-800 pt-6">
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="rounded-lg bg-[#C4A882] px-6 py-2.5 text-sm font-semibold text-[#0F0F0F] transition hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? 'Guardando...' : 'Guardar cambios'}
        </button>

        {savedMessage && (
          <span className="text-sm text-emerald-400">✓ Guardado correctamente</span>
        )}
      </div>

    </div>
  )
}