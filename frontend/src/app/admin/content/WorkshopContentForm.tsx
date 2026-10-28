'use client'

import { useState, useTransition } from 'react'
import Image from 'next/image'
import { updateContentBlock } from './actions'
import UploadContentImage from './UploadContentImage'
import Switch from './Switch'

type ImageRow = {
  id: string
  ruta_storage: string
  nombre_archivo: string
}

type WorkshopBlock = {
  id: string
  seccion: string
  data: {
    eyebrow?: string
    titulo?: string
    descripcion?: string
    detalles?: string[]
    activo?: boolean
  }
  imagen_id: string | null
  image: { id: string; ruta_storage: string }[] | null
} | null

type Props = {
  block: WorkshopBlock
  imageLibrary: ImageRow[]
}

type ImageRelation =
  | { id: string; ruta_storage: string }
  | { id: string; ruta_storage: string }[]
  | null
  | undefined

function getImage(img: ImageRelation): string | null {
  if (!img) return null
  if (Array.isArray(img)) return img[0]?.ruta_storage ?? null
  return img.ruta_storage ?? null
}

export default function WorkshopContentForm({ block }: Props) {
  const [activo, setActivo] = useState(block?.data?.activo ?? true)
  const [eyebrow, setEyebrow] = useState(block?.data?.eyebrow ?? '')
  const [titulo, setTitulo] = useState(block?.data?.titulo ?? '')
  const [descripcion, setDescripcion] = useState(block?.data?.descripcion ?? '')
  const [detalles, setDetalles] = useState<string[]>(
    block?.data?.detalles ?? ['']
  )
  const [selectedImageId, setSelectedImageId] = useState<string | null>(
    block?.imagen_id ?? null
  )
  const [uploadedPreview, setUploadedPreview] = useState<{
    id: string
    ruta_storage: string
  } | null>(null)
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)

  const currentImage = getImage(block?.image)
  const previewImage =
    selectedImageId && uploadedPreview?.id === selectedImageId
      ? uploadedPreview.ruta_storage
      : currentImage

  function updateDetail(index: number, value: string) {
    setDetalles((prev) =>
      prev.map((item, itemIndex) => (itemIndex === index ? value : item))
    )
  }

  function addDetail() {
    setDetalles((prev) => [...prev, ''])
  }

  function removeDetail(index: number) {
    setDetalles((prev) => {
      if (prev.length <= 1) return prev
      return prev.filter((_, itemIndex) => itemIndex !== index)
    })
  }

  function handleSave() {
    startTransition(async () => {
      await updateContentBlock(
        'historia_workshop',
        {
          activo,
          eyebrow,
          titulo,
          descripcion,
          detalles,
        },
        selectedImageId
      )

      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    })
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Historia · Workshop</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Edita el contenido de la sección Workshop de la página Historia.
          </p>
        </div>

        <Switch checked={activo} onChange={setActivo} />
      </div>

      <div className="mt-6 grid gap-8 md:grid-cols-2">
        <div className="space-y-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-300">
              Eyebrow
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
              Título
            </label>
            <input
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
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
              rows={4}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-[#E8E4DC] outline-none focus:border-[#C4A882] resize-none"
            />
          </div>

          <div className="space-y-4">
            {detalles.map((detalle, index) => (
              <div key={index} className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
                <div className="mb-3 flex items-center justify-between gap-4">
                  <p className="text-sm font-medium text-zinc-300">
                    Detalle {index + 1}
                  </p>
                  <button
                    type="button"
                    onClick={() => removeDetail(index)}
                    disabled={detalles.length <= 1}
                    className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-semibold text-zinc-200 transition hover:border-red-400 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Eliminar
                  </button>
                </div>
                <input
                  type="text"
                  value={detalle}
                  onChange={(e) => updateDetail(index, e.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-[#E8E4DC] outline-none focus:border-[#C4A882]"
                />
              </div>
            ))}

            <button
              type="button"
              onClick={addDetail}
              className="rounded-lg bg-transparent border border-zinc-700 px-4 py-2 text-sm text-zinc-200 transition hover:border-[#C4A882] hover:text-[#C4A882]"
            >
              Añadir detalle
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <label className="block text-sm font-medium text-zinc-300">
            Imagen de Workshop
          </label>

          <div className="relative h-48 w-full overflow-hidden rounded-lg border border-zinc-700 bg-zinc-800">
            {previewImage ? (
              <Image
                src={previewImage}
                alt="Workshop image"
                fill
                className="object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-zinc-500">
                Sin imagen
              </div>
            )}
          </div>

          <UploadContentImage
            onUploaded={(imageId, ruta) => {
              setSelectedImageId(imageId)
              setUploadedPreview({ id: imageId, ruta_storage: ruta })
            }}
          />

          <p className="text-xs text-zinc-500">
            La imagen subida se guardará en la sección Workshop.
          </p>
        </div>
      </div>

      <div className="mt-8 flex items-center gap-4 border-t border-zinc-800 pt-6">
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="rounded-lg bg-[#C4A882] px-6 py-2.5 text-sm font-semibold text-[#0F0F0F] transition hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? 'Guardando...' : 'Guardar cambios'}
        </button>

        {saved && <span className="text-sm text-emerald-400">✓ Guardado correctamente</span>}
      </div>
    </div>
  )
}