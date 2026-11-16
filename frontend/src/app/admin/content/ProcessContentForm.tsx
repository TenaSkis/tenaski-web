'use client'

import { useState, useTransition } from 'react'
import Image from 'next/image'
import { updateContentBlock } from './actions'
import UploadContentImage from './UploadContentImage'
import Switch from './Switch'

// Misma idea que en los otros forms: `image` puede venir como objeto
// o como array según cómo PostgREST resuelva la FK en runtime.
type ImageRelation =
  | { id: string; ruta_storage: string }
  | { id: string; ruta_storage: string }[]
  | null
  | undefined

type Step = {
  titulo?: string
  descripcion?: string
  imagen_id?: string | null
  image?: ImageRelation
  uploadedPreview?: { id: string; ruta_storage: string } | null
}

type ProcessBlock = {
  id: string
  seccion: string
  data: {
    eyebrow?: string
    titulo?: string
    descripcion?: string
    activo?: boolean
  }
  image: ImageRelation
} | null

type Props = {
  block: ProcessBlock
  steps: Record<string, Step>
}

// ─────────────────────────────────────────────
// HELPER: extrae ruta_storage sea objeto o array
// (mismo patrón que en page.tsx / HeroContentForm / ManifestoContentForm)
// ─────────────────────────────────────────────
function getImage(img: ImageRelation): string | null {
  if (!img) return null
  if (Array.isArray(img)) return img[0]?.ruta_storage ?? null
  return img.ruta_storage ?? null
}

export default function ProcessContentForm({
  block,
  steps,
}: Props) {
  const [activo, setActivo] = useState(block?.data?.activo ?? true)
  const [eyebrow, setEyebrow] = useState(block?.data?.eyebrow ?? '')
  const [titulo, setTitulo] = useState(block?.data?.titulo ?? '')
  const [descripcion, setDescripcion] = useState(block?.data?.descripcion ?? '')
  const [localSteps, setLocalSteps] = useState<Record<string, Step>>(steps)

  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)

  function handleStepChange(section: string, field: keyof Step, value: string) {
    setLocalSteps((current) => ({
      ...current,
      [section]: {
        ...current[section],
        [field]: value,
      },
    }))
  }

  function handleStepImageUpload(section: string, imageId: string, ruta: string) {
    setLocalSteps((current) => ({
      ...current,
      [section]: {
        ...current[section],
        imagen_id: imageId,
        uploadedPreview: { id: imageId, ruta_storage: ruta },
      },
    }))
  }

  function handleSave() {
    startTransition(async () => {
      const updatePromises = [
        updateContentBlock(
          'home_process',
          {
            activo,
            eyebrow,
            titulo,
            descripcion,
          },
          null
        ),
        ...Object.entries(localSteps).map(([seccion, stepData]) =>
          updateContentBlock(seccion, {
            titulo: stepData?.titulo ?? '',
            descripcion: stepData?.descripcion ?? '',
          }, stepData?.imagen_id ?? null)
        ),
      ]

      await Promise.all(updatePromises)

      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    })
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Process · Home</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Edita el contenido de los pasos de creación de los esquis. Cada paso tiene un título, una descripción y una imagen asociada.
          </p>
        </div>

        <Switch checked={activo} onChange={setActivo} />
      </div>

      <div className="mt-6 space-y-4">
        <input
          value={eyebrow}
          onChange={(e) => setEyebrow(e.target.value)}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-[#E8E4DC] outline-none focus:border-[#C4A882]"
          placeholder="Eyebrow"
        />

        <input
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-[#E8E4DC] outline-none focus:border-[#C4A882]"
          placeholder="Título"
        />

        <textarea
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-[#E8E4DC] outline-none focus:border-[#C4A882] resize-none"
          rows={3}
          placeholder="Descripción"
        />
      </div>

      {/* STEPS (solo visual por ahora) */}
      <div className="mt-6 grid gap-3 md:grid-cols-2">
        {Object.entries(localSteps).map(([key, step]) => {
          // Si acabamos de subir una imagen nueva para este step, usamos el
          // preview en memoria. Si no, leemos la ya guardada con getImage()
          // (soporta que `image` venga como objeto o como array).
          const imagePreview =
            step?.uploadedPreview?.id === step?.imagen_id
              ? step?.uploadedPreview?.ruta_storage
              : getImage(step?.image)

          return (
            <div key={key} className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
              <p className="text-sm text-zinc-400">{key}</p>

              <div className="mt-4 space-y-3">
                <input
                  value={step?.titulo ?? ''}
                  onChange={(e) => handleStepChange(key, 'titulo', e.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-[#E8E4DC] outline-none focus:border-[#C4A882]"
                  placeholder="Título del paso"
                />
                <textarea
                  value={step?.descripcion ?? ''}
                  onChange={(e) => handleStepChange(key, 'descripcion', e.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-[#E8E4DC] outline-none focus:border-[#C4A882] resize-none"
                  rows={3}
                  placeholder="Descripción del paso"
                />

                <div className="space-y-2">
                  <div className="relative h-40 w-full overflow-hidden rounded-lg border border-zinc-700 bg-zinc-800">
                    {imagePreview ? (
                      <Image
                        src={imagePreview}
                        alt={`Imagen ${key}`}
                        fill
                        sizes="(min-width: 1280px) 590px, (min-width: 768px) 45vw, calc(100vw - 80px)"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm text-zinc-500">
                        Sin imagen
                      </div>
                    )}
                  </div>

                  <UploadContentImage
                    onUploaded={(imageId, ruta) =>
                      handleStepImageUpload(key, imageId, ruta)
                    }
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <button
        type="button"
        onClick={handleSave}
        disabled={isPending}
        className="mt-6 rounded-lg bg-[#C4A882] px-6 py-2.5 text-sm font-semibold text-[#0F0F0F] transition hover:opacity-90 disabled:opacity-50"
      >
        {isPending ? 'Guardando...' : 'Guardar Process'}
      </button>

      {saved && (
        <p className="mt-2 text-sm text-green-400">Guardado correctamente</p>
      )}
    </div>
  )
}