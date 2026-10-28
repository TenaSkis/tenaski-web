'use client'

import { useState, useTransition } from 'react'
import Image from 'next/image'
import {
  updateContentBlock,
  createAcabado,
  deleteAcabado,
  toggleAcabadoSinGrabado,
} from './actions'
import UploadContentImage from './UploadContentImage'
import Switch from './Switch'

type ImageRelation =
  | { id: string; ruta_storage: string }
  | { id: string; ruta_storage: string }[]
  | null
  | undefined

type AcabadoPremiumRow = {
  id: string
  nombre: string
  descripcion: string | null
  precio_extra: number | null
  imagen_id: string | null
  image: ImageRelation
  sin_grabado: boolean
}

type SectionBlock = {
  id: string
  seccion: string
  data: {
    activo?: boolean
    eyebrow?: string
    descripcion?: string
  }
} | null

type Props = {
  block: SectionBlock
  acabados: AcabadoPremiumRow[]
}

function getImage(img: ImageRelation): string | null {
  if (!img) return null
  if (Array.isArray(img)) return img[0]?.ruta_storage ?? null
  return img.ruta_storage ?? null
}

export default function AcabadosPremiumContentForm({ block, acabados }: Props) {
  const [activo, setActivo] = useState(block?.data?.activo ?? true)
  const [eyebrow, setEyebrow] = useState(block?.data?.eyebrow ?? 'Acabados premium')
  const [descripcion, setDescripcion] = useState(
    block?.data?.descripcion ??
      'Acabados exclusivos con un coste adicional sobre el precio base.'
  )

  const [isPending, startTransition] = useTransition()
  const [savedMessage, setSavedMessage] = useState(false)

  // ── Nuevo acabado premium ──────────────────────────────────
  const [nuevoNombre, setNuevoNombre] = useState('')
  const [nuevaDescripcion, setNuevaDescripcion] = useState('')
  const [nuevoPrecio, setNuevoPrecio] = useState('')
  const [nuevaImagenId, setNuevaImagenId] = useState<string | null>(null)
  const [nuevaImagenPreview, setNuevaImagenPreview] = useState<string | null>(null)
  const [nuevoSinGrabado, setNuevoSinGrabado] = useState(false)
  const [isCreating, startCreating] = useTransition()

  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isDeleting, startDeleting] = useTransition()

  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [isToggling, startToggling] = useTransition()

  function handleSaveSection() {
    startTransition(async () => {
      await updateContentBlock('acabados_premium_home', {
        activo,
        eyebrow,
        descripcion,
      })
      setSavedMessage(true)
      setTimeout(() => setSavedMessage(false), 2500)
    })
  }

  function handleAddAcabado() {
    const precio = parseFloat(nuevoPrecio)
    if (!nuevoNombre || !nuevaImagenId || Number.isNaN(precio) || precio < 0) return

    startCreating(async () => {
      await createAcabado(
        nuevoNombre,
        nuevaDescripcion,
        nuevaImagenId,
        acabados.length,
        true,
        precio,
        nuevoSinGrabado
      )
      setNuevoNombre('')
      setNuevaDescripcion('')
      setNuevoPrecio('')
      setNuevaImagenId(null)
      setNuevaImagenPreview(null)
      setNuevoSinGrabado(false)
    })
  }

  function handleDeleteAcabado(id: string) {
    setDeletingId(id)
    startDeleting(async () => {
      await deleteAcabado(id)
      setDeletingId(null)
    })
  }

  function handleToggleSinGrabado(id: string, current: boolean) {
    setTogglingId(id)
    startToggling(async () => {
      await toggleAcabadoSinGrabado(id, !current)
      setTogglingId(null)
    })
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Acabados premium</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Activa o desactiva la sección y edita su texto introductorio.
          </p>
        </div>

        <Switch checked={activo} onChange={setActivo} />
      </div>

      <div className="mt-8 space-y-8">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-300">
            Eyebrow (etiqueta superior)
          </label>
          <input
            type="text"
            value={eyebrow}
            onChange={(e) => setEyebrow(e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-[#E8E4DC] outline-none focus:border-[#C4A882]"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-300">
            Descripción
          </label>
          <textarea
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-[#E8E4DC] outline-none focus:border-[#C4A882] resize-none"
          />
        </div>
      </div>

      <div className="mt-8 flex items-center gap-4 border-t border-zinc-800 pt-6">
        <button
          type="button"
          onClick={handleSaveSection}
          disabled={isPending}
          className="rounded-lg bg-[#C4A882] px-6 py-2.5 text-sm font-semibold text-[#0F0F0F] transition hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? 'Guardando...' : 'Guardar cambios'}
        </button>

        {savedMessage && (
          <span className="text-sm text-emerald-400">✓ Guardado correctamente</span>
        )}
      </div>

      {/* ── LISTA DE ACABADOS PREMIUM ─────────────────────────────── */}
      <div className="mt-10 border-t border-zinc-800 pt-8">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
          Acabados premium ({acabados.length})
        </h3>
        <p className="mt-1 text-xs text-zinc-500">
          &quot;Sin grabado&quot; oculta las opciones de añadir imagen/texto en espátula y
          cola cuando el cliente elige ese acabado en el diseñador.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {acabados.map((acabado) => (
            <div
              key={acabado.id}
              className="flex flex-col gap-3 rounded-lg border border-zinc-700 bg-zinc-800 p-3"
            >
              <div className="flex items-center gap-3">
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md border border-zinc-600">
                  {getImage(acabado.image) ? (
                    <Image
                      src={getImage(acabado.image)!}
                      alt={acabado.nombre}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-[10px] text-zinc-500">
                      Sin imagen
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[#E8E4DC]">
                    {acabado.nombre}
                  </p>
                  {acabado.descripcion && (
                    <p className="truncate text-xs text-zinc-500">{acabado.descripcion}</p>
                  )}
                  {typeof acabado.precio_extra === 'number' && (
                    <p className="text-xs font-semibold text-[#C4A882]">
                      +{acabado.precio_extra.toFixed(2)} €
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleDeleteAcabado(acabado.id)}
                  disabled={isDeleting && deletingId === acabado.id}
                  className="shrink-0 text-xs font-medium text-red-400 transition hover:text-red-300 disabled:opacity-50"
                >
                  {isDeleting && deletingId === acabado.id ? 'Eliminando...' : 'Eliminar'}
                </button>
              </div>

              <button
                type="button"
                onClick={() => handleToggleSinGrabado(acabado.id, acabado.sin_grabado)}
                disabled={isToggling && togglingId === acabado.id}
                className={`w-full rounded-md border px-3 py-1.5 text-xs font-medium transition disabled:opacity-50 ${
                  acabado.sin_grabado
                    ? 'border-[#C4A882] bg-[#C4A882]/10 text-[#C4A882]'
                    : 'border-zinc-600 text-zinc-400 hover:border-zinc-500'
                }`}
              >
                {isToggling && togglingId === acabado.id
                  ? 'Actualizando...'
                  : acabado.sin_grabado
                    ? '✓ Sin grabado (activado)'
                    : 'Marcar como "sin grabado"'}
              </button>
            </div>
          ))}

          {acabados.length === 0 && (
            <p className="text-sm text-zinc-500">Todavía no hay acabados premium añadidos.</p>
          )}
        </div>
      </div>

      {/* ── AÑADIR NUEVO ACABADO PREMIUM ──────────────────────────── */}
      <div className="mt-8 rounded-lg border border-dashed border-zinc-700 p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
          Añadir acabado premium
        </h3>

        <div className="mt-4 grid gap-5 md:grid-cols-2">
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-300">
                Nombre
              </label>
              <input
                type="text"
                value={nuevoNombre}
                onChange={(e) => setNuevoNombre(e.target.value)}
                placeholder="Ej. Nogal premium"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-[#E8E4DC] outline-none focus:border-[#C4A882]"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-300">
                Descripción breve
              </label>
              <input
                type="text"
                value={nuevaDescripcion}
                onChange={(e) => setNuevaDescripcion(e.target.value)}
                placeholder="Ej. Veta oscura, acabado brillante"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-[#E8E4DC] outline-none focus:border-[#C4A882]"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-300">
                Precio extra (€)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={nuevoPrecio}
                onChange={(e) => setNuevoPrecio(e.target.value)}
                placeholder="Ej. 45.00"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-[#E8E4DC] outline-none focus:border-[#C4A882]"
              />
            </div>

            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input
                type="checkbox"
                checked={nuevoSinGrabado}
                onChange={(e) => setNuevoSinGrabado(e.target.checked)}
                className="accent-[#C4A882]"
              />
              Marcar como &quot;sin grabado&quot; (no permitirá personalizar espátula/cola)
            </label>
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-medium text-zinc-300">
              Imagen del acabado
            </label>

            <div className="relative h-28 w-28 overflow-hidden rounded-lg border border-zinc-700 bg-zinc-800">
              {nuevaImagenPreview ? (
                <Image
                  src={nuevaImagenPreview}
                  alt="Nuevo acabado premium"
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-zinc-500">
                  Sin imagen
                </div>
              )}
            </div>

            <UploadContentImage
              onUploaded={(imageId, ruta) => {
                setNuevaImagenId(imageId)
                setNuevaImagenPreview(ruta)
              }}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={handleAddAcabado}
          disabled={
            isCreating ||
            !nuevoNombre ||
            !nuevaImagenId ||
            nuevoPrecio === '' ||
            Number.isNaN(parseFloat(nuevoPrecio))
          }
          className="mt-5 rounded-lg bg-[#C4A882] px-6 py-2.5 text-sm font-semibold text-[#0F0F0F] transition hover:opacity-90 disabled:opacity-50"
        >
          {isCreating ? 'Añadiendo...' : 'Añadir acabado premium'}
        </button>
      </div>
    </div>
  )
}