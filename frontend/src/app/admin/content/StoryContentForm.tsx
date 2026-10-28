'use client'

import { useState, useTransition } from 'react'
import Image from 'next/image'
import { updateContentBlock } from './actions'
import UploadContentImage from './UploadContentImage'

type ImageRow = {
  id: string
  ruta_storage: string
  nombre_archivo: string
}

type StoryBlock = {
  id: string
  seccion: string
  data: {
    eyebrow?: string
    titulo?: string
    descripcion?: string
  }
  imagen_id: string | null
  image: { id: string; ruta_storage: string }[] | null
} | null

type Props = {
  block: StoryBlock
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

export default function StoryContentForm({ block }: Props) {
  const [eyebrow, setEyebrow] = useState(block?.data?.eyebrow ?? '')
  const [titulo, setTitulo] = useState(block?.data?.titulo ?? '')
  const [descripcion, setDescripcion] = useState(block?.data?.descripcion ?? '')
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

  function handleSave() {
    startTransition(async () => {
      await updateContentBlock(
        'historia_story',
        {
          eyebrow,
          titulo,
          descripcion,
        },
        selectedImageId
      )

      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    })
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
      <h2 className="text-xl font-semibold">Historia · Story</h2>
      <p className="mt-1 text-sm text-zinc-400">
        Edita el contenido de la sección Story de la página Historia.
      </p>

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
        </div>

        <div className="space-y-4">
          <label className="block text-sm font-medium text-zinc-300">
            Imagen de Story
          </label>

          <div className="relative h-48 w-full overflow-hidden rounded-lg border border-zinc-700 bg-zinc-800">
            {previewImage ? (
              <Image
                src={previewImage}
                alt="Story image"
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
            La imagen subida se guardará en la sección Story.
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

        {saved && (
          <span className="text-sm text-emerald-400">✓ Guardado correctamente</span>
        )}
      </div>
    </div>
  )
}
