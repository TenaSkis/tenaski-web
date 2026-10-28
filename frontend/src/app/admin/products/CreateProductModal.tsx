'use client'

import { useState, useRef, useCallback } from 'react'
import { createProductWithImages } from './actions'
import { supabase } from '@/lib/supabase/client'

type Props = {
  open: boolean
  onClose: () => void
}

type ExistingImage = {
  id: string
  nombre_archivo: string
  ruta_storage: string
  texto_alt: string | null
}

type PendingFile = {
  localId: string
  file: File
  preview: string
}

function makeLocalId() {
  return Math.random().toString(36).slice(2)
}

export default function CreateProductModal({ open, onClose }: Props) {
  const [step, setStep] = useState<1 | 2>(1)

  const [formValues, setFormValues] = useState({
    nombre: '',
    precio: '',
    descripcion_corta: '',
    descripcion_larga: '',
    publicado: false,
    destacado: false,
    otro_producto: false,
  })

  // ── Medidas y precios extra de zona ───────────────────────
  // medidas: hasta 3 valores libres (ej. '1.60'). Vacío = no se
  // muestra selector de medida en el DesignModal.
  const [medidas, setMedidas] = useState<string[]>(['', '', ''])

  const addMedidaField = () => {
    setMedidas((prev) => [...prev, ''])
  }

  const removeMedidaField = (index: number) => {
    setMedidas((prev) => prev.filter((_, i) => i !== index))
  }

  const [precioExtraEspatula, setPrecioExtraEspatula] = useState('')
  const [precioExtraCola, setPrecioExtraCola] = useState('')

  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([])
  const [existingImages, setExistingImages] = useState<ExistingImage[]>([])
  const [selectedExisting, setSelectedExisting] = useState<Set<string>>(new Set())
  const [loadingExisting, setLoadingExisting] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  const [loading, setLoading] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === overlayRef.current) handleClose()
  }

  const handleClose = () => {
    setStep(1)
    setFormValues({
      nombre: '',
      precio: '',
      descripcion_corta: '',
      descripcion_larga: '',
      publicado: false,
      destacado: false,
      otro_producto: false,
    })
    setMedidas(['', '', ''])
    setPrecioExtraEspatula('')
    setPrecioExtraCola('')
    setPendingFiles([])
    setSelectedExisting(new Set())
    onClose()
  }

  const handleStep1Continue = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    loadExistingImages()
    setStep(2)
  }

  const loadExistingImages = async () => {
    setLoadingExisting(true)
    try {
      const { data, error } = await supabase
        .from('image')
        .select('id, nombre_archivo, ruta_storage, texto_alt')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(40)

      if (error) throw error
      setExistingImages(data ?? [])
    } catch (err) {
      console.error('Error cargando imágenes existentes:', err)
    } finally {
      setLoadingExisting(false)
    }
  }

  const addFiles = (fileList: FileList | File[]) => {
    const newPending: PendingFile[] = Array.from(fileList).map((file) => ({
      localId: makeLocalId(),
      file,
      preview: URL.createObjectURL(file),
    }))
    setPendingFiles((prev) => [...prev, ...newPending])
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files)
      e.target.value = ''
    }
  }

  const removePending = (localId: string) => {
    setPendingFiles((prev) => {
      const item = prev.find((f) => f.localId === localId)
      if (item) URL.revokeObjectURL(item.preview)
      return prev.filter((f) => f.localId !== localId)
    })
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const dropped = Array.from(e.dataTransfer.files).filter((f) =>
      f.type.startsWith('image/')
    )
    if (dropped.length > 0) addFiles(dropped)
  }, [])

  const toggleExisting = (id: string) => {
    setSelectedExisting((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleMedidaChange = (index: number, value: string) => {
    setMedidas((prev) => {
      const next = [...prev]
      next[index] = value
      return next
    })
  }

  const handleSubmit = async () => {
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No autorizado')

      const uploadedImageIds: string[] = []

      for (const pending of pendingFiles) {
        const fileName = `${Date.now()}-${pending.file.name}`

        const { error: storageError } = await supabase.storage
          .from('product-images')
          .upload(fileName, pending.file)

        if (storageError) throw storageError

        const { data: urlData } = supabase.storage
          .from('product-images')
          .getPublicUrl(fileName)

        const { data: imgRow, error: imgError } = await supabase
          .from('image')
          .insert({
            nombre_archivo: pending.file.name,
            ruta_storage: urlData.publicUrl,
            uploaded_by: user!.id,
          })
          .select('id')
          .single()

        if (imgError) throw imgError
        uploadedImageIds.push(imgRow.id)
      }

      const allImageIds = [
        ...uploadedImageIds,
        ...Array.from(selectedExisting),
      ]

      // Solo medidas rellenadas, sin espacios y máximo 3
      const medidasFiltradas = medidas
        .map((m) => m.trim())
        .filter((m) => m.length > 0)

      const formData = new FormData()
      formData.set('nombre', formValues.nombre)
      formData.set('precio', formValues.precio)
      formData.set('descripcion_corta', formValues.descripcion_corta)
      formData.set('descripcion_larga', formValues.descripcion_larga)
      if (formValues.publicado) formData.set('publicado', 'on')
      if (formValues.destacado) formData.set('destacado', 'on')
      if (formValues.otro_producto) formData.set('otro_producto', 'on')
      formData.set('image_ids', JSON.stringify(allImageIds))
      formData.set('medidas', JSON.stringify(medidasFiltradas))
      formData.set('precio_extra_espatula', precioExtraEspatula || '0')
      formData.set('precio_extra_cola', precioExtraCola || '0')

      await createProductWithImages(formData)

      handleClose()
    } catch (err) {
      console.error(err)
      alert('Error al guardar el producto. Revisa la consola.')
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 p-4 overflow-y-auto"
    >
      <div
        className="
          relative w-full max-w-2xl my-auto
          bg-zinc-950 rounded-xl border border-zinc-800
          flex flex-col max-h-[90vh]
        "
      >
        <div className="flex items-center justify-between p-6 border-b border-zinc-800 shrink-0">
          <div>
            <h2 className="text-xl font-semibold text-white">
              {step === 1 ? 'Nuevo producto' : 'Imágenes del producto'}
            </h2>
            <p className="text-sm text-zinc-500 mt-0.5">
              {step === 1
                ? 'Paso 1 de 2 — información del esquí'
                : 'Paso 2 de 2 — añade imágenes'}
            </p>
          </div>

          <button
            onClick={handleClose}
            className="text-zinc-500 hover:text-white transition text-xl leading-none"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-6">
          {step === 1 && (
            <form id="step1-form" onSubmit={handleStep1Continue} className="space-y-5">
              <div>
                <label className="text-sm text-zinc-400">Nombre *</label>
                <input
                  name="nombre"
                  required
                  value={formValues.nombre}
                  onChange={(e) =>
                    setFormValues((v) => ({ ...v, nombre: e.target.value }))
                  }
                  className="w-full mt-2 p-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-zinc-600"
                />
              </div>

              <div>
                <label className="text-sm text-zinc-400">Precio (€) *</label>
                <input
                  name="precio"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={formValues.precio}
                  onChange={(e) =>
                    setFormValues((v) => ({ ...v, precio: e.target.value }))
                  }
                  className="w-full mt-2 p-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-zinc-600"
                />
              </div>

              <div>
                <label className="text-sm text-zinc-400">Descripción corta</label>
                <textarea
                  name="descripcion_corta"
                  rows={2}
                  value={formValues.descripcion_corta}
                  onChange={(e) =>
                    setFormValues((v) => ({
                      ...v,
                      descripcion_corta: e.target.value,
                    }))
                  }
                  className="w-full mt-2 p-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-zinc-600 resize-none"
                />
              </div>

              <div>
                <label className="text-sm text-zinc-400">Descripción larga</label>
                <textarea
                  name="descripcion_larga"
                  rows={5}
                  value={formValues.descripcion_larga}
                  onChange={(e) =>
                    setFormValues((v) => ({
                      ...v,
                      descripcion_larga: e.target.value,
                    }))
                  }
                  className="w-full mt-2 p-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-zinc-600 resize-none"
                />
              </div>

              <div className="flex gap-6 text-sm text-zinc-300">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formValues.publicado}
                    onChange={(e) =>
                      setFormValues((v) => ({
                        ...v,
                        publicado: e.target.checked,
                      }))
                    }
                    className="accent-white"
                  />
                  Publicado
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formValues.destacado}
                    onChange={(e) =>
                      setFormValues((v) => ({
                        ...v,
                        destacado: e.target.checked,
                      }))
                    }
                    className="accent-white"
                  />
                  Destacado
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={formValues.otro_producto} onChange={(e) => setFormValues((v) => ({ ...v, otro_producto: e.target.checked }))} className="accent-white" />
                  Otros productos
                </label>
              </div>

              {/* ── Medidas ─────────────────────────────── */}
              <div className="rounded-lg border border-zinc-800 p-4">
                <label className="text-sm text-zinc-400">
                  Medidas disponibles (opcional)
                </label>
                <p className="mt-1 text-xs text-zinc-600">
                  Si no rellenas ninguna, en &quot;Crea tu diseño&quot; no aparecerá selector de medida.
                </p>

                <div className="mt-3 grid grid-cols-3 gap-3">
                  {medidas.map((m, i) => (
                    <div key={i} className="relative">
                      <input
                        type="text"
                        value={m}
                        onChange={(e) => handleMedidaChange(i, e.target.value)}
                        placeholder="Ej. 1.60"
                        className="w-full p-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-white text-sm focus:outline-none focus:border-zinc-600"
                      />

                      {i >= 3 && (
                        <button
                          type="button"
                          onClick={() => removeMedidaField(i)}
                          className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-zinc-700 text-xs text-white hover:bg-zinc-600"
                          aria-label="Eliminar medida"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={addMedidaField}
                  className="mt-3 text-xs font-medium text-zinc-300 underline underline-offset-2 hover:text-white"
                >
                  + Añadir medida
                </button>
              </div>

              {/* ── Precio extra por zona personalizada ───── */}
              <div className="rounded-lg border border-zinc-800 p-4">
                <label className="text-sm text-zinc-400">
                  Precio extra por personalización
                </label>
                <p className="mt-1 text-xs text-zinc-600">
                  Se suma una sola vez si el cliente añade cualquier imagen o texto en esa zona (independientemente de cuántos elementos ponga).
                </p>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-zinc-500">Espátula (€)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={precioExtraEspatula}
                      onChange={(e) => setPrecioExtraEspatula(e.target.value)}
                      placeholder="0.00"
                      className="w-full mt-1 p-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-white text-sm focus:outline-none focus:border-zinc-600"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500">Cola (€)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={precioExtraCola}
                      onChange={(e) => setPrecioExtraCola(e.target.value)}
                      placeholder="0.00"
                      className="w-full mt-1 p-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-white text-sm focus:outline-none focus:border-zinc-600"
                    />
                  </div>
                </div>
              </div>
            </form>
          )}

          {step === 2 && (
            <div className="space-y-8">
              <div>
                <p className="text-sm text-zinc-400 mb-3">
                  Sube imágenes nuevas
                </p>

                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileInputChange}
                  className="hidden"
                  aria-label="Seleccionar imágenes"
                />

                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`
                    border-2 border-dashed rounded-xl p-10 text-center cursor-pointer
                    transition-colors select-none
                    ${isDragging
                      ? 'border-white bg-zinc-800 text-white'
                      : 'border-zinc-700 hover:border-zinc-500 text-zinc-500 hover:text-zinc-300'
                    }
                  `}
                >
                  <div className="text-3xl mb-2">🖼</div>
                  <p className="text-sm font-medium">
                    Arrastra imágenes aquí o{' '}
                    <span className="underline">haz clic para seleccionar</span>
                  </p>
                  <p className="text-xs mt-1 opacity-60">PNG, JPG, WEBP…</p>
                </div>

                {pendingFiles.length > 0 && (
                  <div className="mt-4 grid grid-cols-3 gap-3">
                    {pendingFiles.map((pf) => (
                      <div key={pf.localId} className="relative group">
                        <img
                          src={pf.preview}
                          alt={pf.file.name}
                          className="w-full aspect-square object-cover rounded-lg border border-zinc-800"
                        />
                        <button
                          type="button"
                          onClick={() => removePending(pf.localId)}
                          className="
                            absolute top-1.5 right-1.5
                            bg-black/70 text-white text-xs rounded-full
                            w-6 h-6 flex items-center justify-center
                            opacity-100 pointer-fine:opacity-0 pointer-fine:group-hover:opacity-100 focus-visible:opacity-100 pointer-coarse:w-8 pointer-coarse:h-8 transition
                          "
                          aria-label={`Quitar imagen pendiente: ${pf.file.name}`}
                        >
                          ✕
                        </button>
                        <p className="mt-1 text-xs text-zinc-500 truncate">
                          {pf.file.name}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <p className="text-sm text-zinc-400 mb-3">
                  O reutiliza imágenes ya subidas
                </p>

                {loadingExisting ? (
                  <p className="text-zinc-600 text-sm">Cargando…</p>
                ) : existingImages.length === 0 ? (
                  <p className="text-zinc-600 text-sm">
                    No hay imágenes en la biblioteca.
                  </p>
                ) : (
                  <div className="grid grid-cols-4 gap-2 max-h-52 overflow-y-auto pr-1">
                    {existingImages.map((img) => {
                      const selected = selectedExisting.has(img.id)
                      return (
                        <button
                          key={img.id}
                          type="button"
                          onClick={() => toggleExisting(img.id)}
                          className={`
                            relative rounded-lg overflow-hidden border-2 transition
                            ${selected
                              ? 'border-white'
                              : 'border-transparent opacity-60 hover:opacity-90'
                            }
                          `}
                          aria-label={img.nombre_archivo}
                        >
                          <img
                            src={img.ruta_storage}
                            alt={img.texto_alt ?? img.nombre_archivo}
                            className="w-full aspect-square object-cover"
                          />
                          {selected && (
                            <div className="absolute inset-0 bg-white/10 flex items-center justify-center">
                              <span className="text-white text-xl">✓</span>
                            </div>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="shrink-0 p-6 border-t border-zinc-800 flex justify-between items-center gap-3">
          {step === 1 ? (
            <button
              type="button"
              onClick={handleClose}
              className="px-5 py-2 text-sm text-zinc-400 hover:text-white transition"
            >
              Cancelar
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-5 py-2 text-sm text-zinc-400 hover:text-white transition"
            >
              ← Volver
            </button>
          )}

          {step === 1 ? (
            <button
              type="submit"
              form="step1-form"
              className="bg-white text-black px-6 py-2 rounded-lg font-medium hover:bg-zinc-200 transition"
            >
              Continuar →
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="bg-white text-black px-6 py-2 rounded-lg font-medium hover:bg-zinc-200 transition disabled:opacity-50"
            >
              {loading ? 'Guardando…' : 'Guardar producto'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}