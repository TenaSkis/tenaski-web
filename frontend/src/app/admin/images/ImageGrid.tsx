'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  addToGallery,
  removeFromGallery,
  deleteImagePermanently,
  getImageUsage,
  type GallerySize,
} from './actions'
import UploadGalleryImage from './UploadGalleryImage'

type ImageRow = {
  id: string
  nombre_archivo: string
  ruta_storage: string
  texto_alt: string | null
  en_galeria: boolean
  galeria_size: GallerySize | null
  galeria_orden: number
}

type Props = {
  images: ImageRow[]
  usedIds: string[]
}

const SIZE_LABEL: Record<GallerySize, string> = {
  lg: 'Grande',
  md: 'Mediana',
  sm: 'Pequeña',
}

export default function ImageGrid({ images: initialImages, usedIds }: Props) {
  const router = useRouter()
  const [images, setImages] = useState<ImageRow[]>(initialImages)

  // ── Modal galería (añadir/editar) ──────────────────────
  const [galleryTarget, setGalleryTarget] = useState<ImageRow | null>(null)
  const [size, setSize] = useState<GallerySize>('md')
  const [alt, setAlt] = useState('')
  const [orden, setOrden] = useState(0)
  const [savingGallery, setSavingGallery] = useState(false)

  // ── Confirmar borrado permanente ───────────────────────
  const [deleteTarget, setDeleteTarget] = useState<ImageRow | null>(null)
  const [deleteBlockedReason, setDeleteBlockedReason] = useState<string | null>(null)
  const [checkingUsage, setCheckingUsage] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // ── Loading por acción "quitar de galería" ─────────────
  const [removingId, setRemovingId] = useState<string | null>(null)

  function openGalleryModal(img: ImageRow) {
    setGalleryTarget(img)
    setSize(img.galeria_size ?? 'md')
    setAlt(img.texto_alt ?? '')
    setOrden(img.galeria_orden ?? 0)
  }

  async function handleSaveGallery() {
    if (!galleryTarget) return
    setSavingGallery(true)
    try {
      await addToGallery(galleryTarget.id, size, alt, orden)
      setImages((prev) =>
        prev.map((img) =>
          img.id === galleryTarget.id
            ? { ...img, en_galeria: true, galeria_size: size, texto_alt: alt, galeria_orden: orden }
            : img
        )
      )
      setGalleryTarget(null)
    } catch (err) {
      console.error(err)
      alert('Error al guardar en galería.')
    } finally {
      setSavingGallery(false)
    }
  }

  async function handleRemoveFromGallery(img: ImageRow) {
    setRemovingId(img.id)
    try {
      await removeFromGallery(img.id)
      setImages((prev) =>
        prev.map((i) => (i.id === img.id ? { ...i, en_galeria: false } : i))
      )
    } catch (err) {
      console.error(err)
      alert('Error al quitar de galería.')
    } finally {
      setRemovingId(null)
    }
  }

  async function openDeleteModal(img: ImageRow) {
    setDeleteTarget(img)
    setDeleteBlockedReason(null)
    setCheckingUsage(true)
    try {
      const usage = await getImageUsage(img.id)
      if (usage.inUse) {
        const partes = []
        if (usage.productos) partes.push(`${usage.productos} producto(s)`)
        if (usage.paginas) partes.push(`${usage.paginas} página(s)`)
        if (usage.contenido) partes.push(`${usage.contenido} bloque(s) de contenido`)
        setDeleteBlockedReason(`En uso por: ${partes.join(', ')}.`)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setCheckingUsage(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try {
      await deleteImagePermanently(deleteTarget.id, deleteTarget.ruta_storage)
      setImages((prev) => prev.filter((i) => i.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch (err: unknown) {
      const error = err as { message?: string }
      console.error(err)
      alert(error?.message || 'Error al eliminar la imagen.')
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <div className="space-y-6">

      {/* ── Header ──────────────────────────────────── */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-semibold">Imágenes</h1>
          <p className="mt-2 text-zinc-400">
            Gestiona la biblioteca de imágenes y qué se muestra en la galería pública.
          </p>
        </div>

        <UploadGalleryImage
          onUploaded={(img) => {
            setImages((prev) => [
              {
                id: img.id,
                nombre_archivo: img.nombre_archivo,
                ruta_storage: img.ruta_storage,
                texto_alt: null,
                en_galeria: false,
                galeria_size: null,
                galeria_orden: 0,
              },
              ...prev,
            ])
            router.refresh()
          }}
        />
      </div>

      {/* ── Grid ────────────────────────────────────── */}
      {images.length === 0 ? (
        <p className="text-zinc-600 text-sm">No hay imágenes aún.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {images.map((img) => {
            const isUsed = usedIds.includes(img.id)
            return (
              <div
                key={img.id}
                className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden flex flex-col"
              >
                <div className="relative aspect-square bg-zinc-800">
                  <img
                    src={img.ruta_storage}
                    alt={img.texto_alt ?? img.nombre_archivo}
                    className="w-full h-full object-cover"
                  />
                  {img.en_galeria && (
                    <span className="absolute top-2 left-2 rounded-full bg-[#C4A882] px-2 py-0.5 text-[10px] font-semibold text-[#0F0F0F]">
                      Galería · {SIZE_LABEL[img.galeria_size ?? 'md']}
                    </span>
                  )}
                </div>

                <div className="p-3 flex-1 flex flex-col gap-2">
                  <p className="text-xs text-zinc-400 truncate" title={img.nombre_archivo}>
                    {img.nombre_archivo}
                  </p>

                  <div className="mt-auto flex flex-col gap-1.5">
                    <button
                      onClick={() => openGalleryModal(img)}
                      className="w-full text-xs font-medium rounded-md bg-zinc-800 text-zinc-200 hover:bg-zinc-700 transition px-2 py-1.5"
                    >
                      {img.en_galeria ? 'Editar en galería' : 'Añadir a galería'}
                    </button>

                    {img.en_galeria && (
                      <button
                        onClick={() => handleRemoveFromGallery(img)}
                        disabled={removingId === img.id}
                        className="w-full text-xs font-medium rounded-md bg-zinc-800 text-zinc-400 hover:bg-zinc-700 transition px-2 py-1.5 disabled:opacity-50"
                      >
                        {removingId === img.id ? 'Quitando...' : 'Quitar de galería'}
                      </button>
                    )}

                    <button
                      onClick={() => openDeleteModal(img)}
                      disabled={isUsed}
                      title={isUsed ? 'En uso, no se puede eliminar' : ''}
                      className="w-full text-xs font-medium rounded-md bg-zinc-800 text-zinc-400 hover:bg-red-900/60 hover:text-red-400 transition px-2 py-1.5 disabled:opacity-30 disabled:hover:bg-zinc-800 disabled:hover:text-zinc-400 disabled:cursor-not-allowed"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Modal: añadir/editar en galería ─────────────── */}
      {galleryTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setGalleryTarget(null) }}
        >
          <div className="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-950 p-6">
            <h2 className="text-lg font-semibold text-white">Ajustes de galería</h2>

            <div className="relative mt-4 h-40 w-full overflow-hidden rounded-lg border border-zinc-700 bg-zinc-800">
              <img
                src={galleryTarget.ruta_storage}
                alt={alt}
                className="h-full w-full object-cover"
              />
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-300">
                  Título (alt de la imagen)
                </label>
                <input
                  type="text"
                  value={alt}
                  onChange={(e) => setAlt(e.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-[#E8E4DC] outline-none focus:border-[#C4A882]"
                  placeholder="Ej: Taller artesanal"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-300">
                  Tamaño en la galería
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['lg', 'md', 'sm'] as GallerySize[]).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSize(s)}
                      className={`rounded-lg border px-3 py-2 text-sm transition ${
                        size === s
                          ? 'border-[#C4A882] bg-[#C4A882]/10 text-[#C4A882]'
                          : 'border-zinc-700 text-zinc-400 hover:border-zinc-500'
                      }`}
                    >
                      {SIZE_LABEL[s]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-300">
                  Orden
                </label>
                <input
                  type="number"
                  value={orden}
                  onChange={(e) => setOrden(Number(e.target.value))}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-[#E8E4DC] outline-none focus:border-[#C4A882]"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setGalleryTarget(null)}
                className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveGallery}
                disabled={savingGallery || !alt.trim()}
                className="rounded-lg bg-[#C4A882] px-5 py-2 text-sm font-semibold text-[#0F0F0F] hover:opacity-90 transition disabled:opacity-50"
              >
                {savingGallery ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: confirmar borrado permanente ─────────── */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setDeleteTarget(null) }}
        >
          <div className="bg-zinc-950 rounded-xl border border-zinc-800 p-8 max-w-sm w-full text-center space-y-5">
            <div className="text-3xl">⚠️</div>
            <h3 className="text-lg font-semibold text-white">¿Eliminar imagen permanentemente?</h3>

            {checkingUsage ? (
              <p className="text-sm text-zinc-500">Comprobando uso...</p>
            ) : deleteBlockedReason ? (
              <p className="text-sm text-red-400">{deleteBlockedReason}</p>
            ) : (
              <p className="text-sm text-zinc-400">
                Esta acción no se puede deshacer. Se borrará también del Storage.
                {deleteTarget.en_galeria && ' Se quitará automáticamente de la galería.'}
              </p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 px-4 py-2 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteLoading || checkingUsage || !!deleteBlockedReason}
                className="flex-1 px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition text-sm font-medium disabled:opacity-50"
              >
                {deleteLoading ? 'Eliminando...' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}