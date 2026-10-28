'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import CreateProductModal from './CreateProductModal'
import { deleteProduct, updateProduct, updateProductImages, setFeaturedProduct } from './actions'

// ─── Tipos ────────────────────────────────────────────────
type Product = {
  id: string
  nombre: string
  precio: number
  descripcion_corta: string | null
  descripcion_larga: string | null
  publicado: boolean
  destacado: boolean
  otro_producto: boolean
  medidas: string[]
  precio_extra_espatula: number
  precio_extra_cola: number
}

type ProductTableProps = {
  products: Product[]
}

type CurrentImage = {
  imagen_id: string
  ruta_storage: string
  nombre_archivo: string
  orden: number
  imagen_principal: boolean
}

type PendingFile = {
  localId: string
  file: File
  preview: string
}

type LibraryImage = {
  id: string
  nombre_archivo: string
  ruta_storage: string
}

type ProductImageRow = {
  imagen_id: string
  orden: number
  imagen_principal: boolean
  image: {
    ruta_storage: string
    nombre_archivo: string
  } | null
}

function makeLocalId() {
  return Math.random().toString(36).slice(2)
}

// ═══════════════════════════════════════════════════════════
export default function ProductTable({ products }: ProductTableProps) {
  const router = useRouter()

  // ── Crear producto ──────────────────────────────────────
  const [createOpen, setCreateOpen] = useState(false)

  // ── Editar producto — datos ─────────────────────────────
  const [editProduct, setEditProduct] = useState<Product | null>(null)
  const [editLoading, setEditLoading] = useState(false)
  const editFormRef = useRef<HTMLFormElement>(null)

  // ── Editar producto — medidas y precio extra ────────────
  const [editMedidas, setEditMedidas] = useState<string[]>([])
  const [editPrecioExtraEspatula, setEditPrecioExtraEspatula] = useState('')
  const [editPrecioExtraCola, setEditPrecioExtraCola] = useState('')

  // ── Editar producto — imágenes actuales ────────────────
  const [currentImages, setCurrentImages] = useState<CurrentImage[]>([])
  const [removedImageIds, setRemovedImageIds] = useState<Set<string>>(new Set())
  const [principalImageId, setPrincipalImageId] = useState<string | null>(null)
  const [loadingCurrentImages, setLoadingCurrentImages] = useState(false)

  // ── Editar producto — nuevas imágenes ──────────────────
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Editar producto — biblioteca ───────────────────────
  const [libraryImages, setLibraryImages] = useState<LibraryImage[]>([])
  const [selectedLibrary, setSelectedLibrary] = useState<Set<string>>(new Set())
  const [loadingLibrary, setLoadingLibrary] = useState(false)

  // ── Destacado ───────────────────────────────────────────
  const [featuredId, setFeaturedId] = useState<string | null>(
    products.find((p) => p.destacado)?.id ?? null
  )
  const [featuredLoading, setFeaturedLoading] = useState(false)

  const handleSetFeatured = async (productId: string) => {
    setFeaturedLoading(true)
    try {
      await setFeaturedProduct(productId)
      setFeaturedId(productId)
    } catch (err) {
      console.error(err)
      alert('Error al cambiar el producto destacado.')
    } finally {
      setFeaturedLoading(false)
    }
  }

  // ── Eliminar producto ───────────────────────────────────
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // ──────────────────────────────────────────────────────────
  // Abrir modal de edición: cargar imágenes actuales + biblioteca
  // ──────────────────────────────────────────────────────────
  const openEdit = async (product: Product) => {
    setEditProduct(product)
    setRemovedImageIds(new Set())
    setPendingFiles([])
    setSelectedLibrary(new Set())
    setPrincipalImageId(null)

    // Medidas: mostramos siempre mínimo 3 huecos, igual que en crear
    const medidasIniciales = [...(product.medidas ?? [])]
    while (medidasIniciales.length < 3) medidasIniciales.push('')
    setEditMedidas(medidasIniciales)

    setEditPrecioExtraEspatula(
      product.precio_extra_espatula ? String(product.precio_extra_espatula) : ''
    )
    setEditPrecioExtraCola(
      product.precio_extra_cola ? String(product.precio_extra_cola) : ''
    )

    // Imágenes actuales del producto
    setLoadingCurrentImages(true)
    const { data: piData } = await supabase
      .from('product_image')
      .select(`
        imagen_id,
        orden,
        imagen_principal,
        image:imagen_id (
          ruta_storage,
          nombre_archivo
        )
      `)
      .eq('producto_id', product.id)
      .order('orden', { ascending: true })
      .overrideTypes<ProductImageRow[], { merge: false }>()

    const mapped = (piData ?? []).map((row) => ({
      imagen_id: row.imagen_id,
      ruta_storage: row.image?.ruta_storage ?? '',
      nombre_archivo: row.image?.nombre_archivo ?? '',
      orden: row.orden,
      imagen_principal: row.imagen_principal,
    }))
    setCurrentImages(mapped)

    // Inicializar cuál es la principal
    const principal = mapped.find((r) => r.imagen_principal)
    setPrincipalImageId(principal?.imagen_id ?? null)

    setLoadingCurrentImages(false)

    // Biblioteca general
    setLoadingLibrary(true)
    const { data: libData } = await supabase
      .from('image')
      .select('id, nombre_archivo, ruta_storage')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(40)

    setLibraryImages(libData ?? [])
    setLoadingLibrary(false)
  }

  const closeEdit = () => {
    setEditProduct(null)
    pendingFiles.forEach((f) => URL.revokeObjectURL(f.preview))
    setPendingFiles([])
    setEditMedidas([])
    setEditPrecioExtraEspatula('')
    setEditPrecioExtraCola('')
  }

  // ──────────────────────────────────────────────────────────
  // Medidas (edición)
  // ──────────────────────────────────────────────────────────
  const addEditMedidaField = () => {
    setEditMedidas((prev) => [...prev, ''])
  }

  const removeEditMedidaField = (index: number) => {
    setEditMedidas((prev) => prev.filter((_, i) => i !== index))
  }

  const handleEditMedidaChange = (index: number, value: string) => {
    setEditMedidas((prev) => {
      const next = [...prev]
      next[index] = value
      return next
    })
  }

  // ──────────────────────────────────────────────────────────
  // Imágenes actuales: marcar para eliminar / restaurar
  // ──────────────────────────────────────────────────────────
  const toggleRemove = (imagenId: string) => {
    setRemovedImageIds((prev) => {
      const next = new Set(prev)
      next.has(imagenId) ? next.delete(imagenId) : next.add(imagenId)
      return next
    })
    // Si se elimina la principal, limpiar selección
    if (principalImageId === imagenId) setPrincipalImageId(null)
  }

  // ──────────────────────────────────────────────────────────
  // Archivos nuevos (drag & drop + input)
  // ──────────────────────────────────────────────────────────
  const addFiles = (fileList: FileList | File[]) => {
    const news: PendingFile[] = Array.from(fileList).map((file) => ({
      localId: makeLocalId(),
      file,
      preview: URL.createObjectURL(file),
    }))
    setPendingFiles((prev) => [...prev, ...news])
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
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

  const handleDragLeave = useCallback(() => setIsDragging(false), [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const dropped = Array.from(e.dataTransfer.files).filter((f) =>
      f.type.startsWith('image/')
    )
    if (dropped.length) addFiles(dropped)
  }, [])

  // ──────────────────────────────────────────────────────────
  // Biblioteca: toggle selección
  // ──────────────────────────────────────────────────────────
  const toggleLibrary = (id: string) => {
    const alreadyLinked = currentImages.some((ci) => ci.imagen_id === id)
    if (alreadyLinked) return
    setSelectedLibrary((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // ──────────────────────────────────────────────────────────
  // GUARDAR EDICIÓN
  // ──────────────────────────────────────────────────────────
  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editProduct) return
    if (!editFormRef.current) return

    setEditLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No autorizado')

      // 1. Subir archivos nuevos a Storage + insertar en tabla image
      const newImageIds: string[] = []
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
            uploaded_by: user.id,
          })
          .select('id')
          .single()
        if (imgError) throw imgError
        newImageIds.push(imgRow.id)
      }

      // 2. IDs a añadir = nuevos subidos + seleccionados de biblioteca
      const imageIdsToAdd = [...newImageIds, ...Array.from(selectedLibrary)]

      // 3. Actualizar datos del producto
      const formData = new FormData(editFormRef.current)

      const medidasFiltradas = editMedidas
        .map((m) => m.trim())
        .filter((m) => m.length > 0)

      formData.set('medidas', JSON.stringify(medidasFiltradas))
      formData.set('precio_extra_espatula', editPrecioExtraEspatula || '0')
      formData.set('precio_extra_cola', editPrecioExtraCola || '0')

      await updateProduct(editProduct.id, formData)

      // 4. Actualizar relaciones de imágenes, pasando la imagen principal elegida
      await updateProductImages(
        editProduct.id,
        Array.from(removedImageIds),
        imageIdsToAdd,
        principalImageId,
      )

      closeEdit()
      router.refresh()
    } catch (err) {
      console.error('Error actualizando producto:', err)
      alert('Error al guardar. Revisa la consola.')
    } finally {
      setEditLoading(false)
    }
  }

  // ──────────────────────────────────────────────────────────
  // ELIMINAR
  // ──────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    setDeleteLoading(true)
    try {
      await deleteProduct(id)
      router.refresh()
    } catch (err) {
      console.error(err)
      alert('Error al eliminar el producto.')
    } finally {
      setDeleteLoading(false)
      setConfirmDelete(null)
    }
  }

  // ──────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* ── Header ────────────────────────────────────── */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-semibold">Productos</h1>
          <p className="mt-2 text-zinc-400">Gestiona el catálogo.</p>
        </div>

        <button
          onClick={() => setCreateOpen(true)}
          className="rounded-lg bg-white px-4 py-2 text-black font-medium hover:bg-zinc-200 transition"
        >
          + Nuevo producto
        </button>
      </div>

      {/* ── Tabla ─────────────────────────────────────── */}
      <div className="overflow-x-auto rounded-xl border border-zinc-800">
        <table className="min-w-[720px] w-full">
          <thead className="bg-zinc-900">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-medium text-zinc-400">Nombre</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-zinc-400">Precio</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-zinc-400">Estado</th>
              <th className="px-6 py-4 text-center text-sm font-medium text-zinc-400">Destacado</th>
              <th className="px-6 py-4 text-right text-sm font-medium text-zinc-400">Acciones</th>
            </tr>
          </thead>

          <tbody>
            {products.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center text-zinc-600 text-sm">
                  No hay productos. Crea el primero.
                </td>
              </tr>
            )}

            {products.map((product) => (
              <tr
                key={product.id}
                className="border-t border-zinc-800 hover:bg-zinc-900/40 transition"
              >
                <td className="px-6 py-4 font-medium">{product.nombre}</td>

                <td className="px-6 py-4 text-zinc-300">
                  {product.precio.toLocaleString('es-ES', {
                    style: 'currency',
                    currency: 'EUR',
                  })}
                </td>

                <td className="px-6 py-4">
                  <span className={`
                    inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full
                    ${product.publicado ? 'bg-emerald-900/40 text-emerald-400' : 'bg-zinc-800 text-zinc-500'}
                  `}>
                    <span className={`w-1.5 h-1.5 rounded-full ${product.publicado ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
                    {product.publicado ? 'Publicado' : 'Borrador'}
                  </span>
                </td>

                {/* Columna destacado — radio button exclusivo */}
                <td className="px-6 py-4 text-center">
                  <button
                    type="button"
                    onClick={() => { if (featuredId !== product.id) handleSetFeatured(product.id) }}
                    disabled={featuredLoading}
                    title={featuredId === product.id ? 'Producto destacado' : 'Marcar como destacado'}
                    className={`
                      w-5 h-5 rounded-full border-2 transition mx-auto flex items-center justify-center
                      ${featuredId === product.id ? 'border-[#C4A882] bg-[#C4A882]' : 'border-zinc-600 hover:border-[#C4A882]'}
                      ${featuredLoading ? 'opacity-50 cursor-wait' : 'cursor-pointer'}
                    `}
                    aria-label={`Destacar ${product.nombre}`}
                  >
                    {featuredId === product.id && (
                      <span className="w-2 h-2 rounded-full bg-[#0F0F0F]" />
                    )}
                  </button>
                </td>

                <td className="px-6 py-4">
                  <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center sm:justify-end">
                    <button
                      onClick={() => openEdit(product)}
                      className="px-3 py-1.5 text-xs font-medium rounded-md bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white transition w-full sm:w-auto"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => setConfirmDelete(product.id)}
                      className="px-3 py-1.5 text-xs font-medium rounded-md bg-zinc-800 text-zinc-400 hover:bg-red-900/60 hover:text-red-400 transition w-full sm:w-auto"
                    >
                      Eliminar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Modal crear ───────────────────────────────── */}
      <CreateProductModal
        open={createOpen}
        onClose={() => {
          setCreateOpen(false)
          router.refresh()
        }}
      />

      {/* ── Modal editar ──────────────────────────────── */}
      {editProduct && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 p-4 overflow-y-auto"
          onClick={(e) => { if (e.target === e.currentTarget) closeEdit() }}
        >
          <div className="relative w-full max-w-2xl my-auto bg-zinc-950 rounded-xl border border-zinc-800 flex flex-col max-h-[90vh]">

            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-zinc-800 shrink-0">
              <div>
                <h2 className="text-xl font-semibold text-white">Editar producto</h2>
                <p className="text-sm text-zinc-500 mt-0.5">{editProduct.nombre}</p>
              </div>
              <button onClick={closeEdit} className="text-zinc-500 hover:text-white transition text-xl" aria-label="Cerrar">
                ✕
              </button>
            </div>

            {/* Contenido con scroll */}
            <form
              id="edit-form"
              ref={editFormRef}
              onSubmit={handleEditSubmit}
              className="overflow-y-auto flex-1 p-6 space-y-8"
            >

              {/* ── Datos ───────────────────────────────── */}
              <div className="space-y-5">
                <div>
                  <label className="text-sm text-zinc-400">Nombre *</label>
                  <input
                    name="nombre"
                    required
                    defaultValue={editProduct.nombre}
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
                    defaultValue={editProduct.precio}
                    className="w-full mt-2 p-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-zinc-600"
                  />
                </div>

                <div>
                  <label className="text-sm text-zinc-400">Descripción corta</label>
                  <textarea
                    name="descripcion_corta"
                    rows={2}
                    defaultValue={editProduct.descripcion_corta ?? ''}
                    className="w-full mt-2 p-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-zinc-600 resize-none"
                  />
                </div>

                <div>
                  <label className="text-sm text-zinc-400">Descripción larga</label>
                  <textarea
                    name="descripcion_larga"
                    rows={5}
                    defaultValue={editProduct.descripcion_larga ?? ''}
                    className="w-full mt-2 p-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-zinc-600 resize-none"
                  />
                </div>

                <div className="flex gap-6 text-sm text-zinc-300">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" name="publicado" defaultChecked={editProduct.publicado} value="on" className="accent-white" />
                    Publicado
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" name="destacado" defaultChecked={editProduct.destacado} value="on" className="accent-white" />
                    Destacado
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" name="otro_producto" defaultChecked={editProduct.otro_producto} value="on" className="accent-white" />
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
                    {editMedidas.map((m, i) => (
                      <div key={i} className="relative">
                        <input
                          type="text"
                          value={m}
                          onChange={(e) => handleEditMedidaChange(i, e.target.value)}
                          placeholder="Ej. 1.60"
                          className="w-full p-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-white text-sm focus:outline-none focus:border-zinc-600"
                        />

                        {i >= 3 && (
                          <button
                            type="button"
                            onClick={() => removeEditMedidaField(i)}
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
                    onClick={addEditMedidaField}
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
                        value={editPrecioExtraEspatula}
                        onChange={(e) => setEditPrecioExtraEspatula(e.target.value)}
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
                        value={editPrecioExtraCola}
                        onChange={(e) => setEditPrecioExtraCola(e.target.value)}
                        placeholder="0.00"
                        className="w-full mt-1 p-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-white text-sm focus:outline-none focus:border-zinc-600"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Separador ───────────────────────────── */}
              <div className="border-t border-zinc-800" />

              {/* ── Imágenes actuales ───────────────────── */}
              <div>
                <p className="text-sm font-medium text-zinc-300 mb-1">Imágenes del producto</p>
                <p className="text-xs text-zinc-500 mb-3">Clic en ★ para marcar la imagen principal (aparece en catálogo y home)</p>

                {loadingCurrentImages ? (
                  <p className="text-zinc-600 text-sm">Cargando…</p>
                ) : currentImages.length === 0 ? (
                  <p className="text-zinc-600 text-sm">Sin imágenes aún.</p>
                ) : (
                  <div className="grid grid-cols-4 gap-2">
                    {currentImages.map((img) => {
                      const marked = removedImageIds.has(img.imagen_id)
                      const isPrincipal = principalImageId === img.imagen_id
                      return (
                        <div key={img.imagen_id} className="relative group">
                          <img
                            src={img.ruta_storage}
                            alt={img.nombre_archivo}
                            className={`
                              w-full aspect-square object-cover rounded-lg border transition
                              ${marked ? 'opacity-30 border-red-700' : isPrincipal ? 'border-[#C4A882]' : 'border-zinc-800'}
                            `}
                          />

                          {/* Estrella — marcar como principal */}
                          {!marked && (
                            <button
                              type="button"
                              onClick={() => setPrincipalImageId(img.imagen_id)}
                              title={isPrincipal ? 'Imagen principal' : 'Marcar como principal'}
                              aria-label={isPrincipal ? 'Imagen principal' : 'Marcar como imagen principal'}
                              className={`
                                absolute top-1.5 left-1.5 w-6 h-6 rounded-full
                                flex items-center justify-center text-xs transition
                                ${isPrincipal
                                  ? 'bg-[#C4A882] text-[#0F0F0F] opacity-100'
                                  : 'bg-black/70 text-white/50 opacity-100 pointer-fine:opacity-0 pointer-fine:group-hover:opacity-100 focus-visible:opacity-100 hover:text-[#C4A882]'}
                                }
                              `}
                            >
                              ★
                            </button>
                          )}

                          {/* X — eliminar imagen */}
                          <button
                            type="button"
                            onClick={() => toggleRemove(img.imagen_id)}
                            className={`
                              absolute top-1.5 right-1.5 text-xs rounded-full w-6 h-6
                              flex items-center justify-center transition
                              ${marked
                                ? 'bg-red-600 text-white opacity-100'
                                : 'bg-black/70 text-white opacity-100 pointer-fine:opacity-0 pointer-fine:group-hover:opacity-100 focus-visible:opacity-100'
                              }
                            `}
                            aria-label={marked ? 'Restaurar imagen del producto' : 'Marcar imagen para eliminar'}
                            title={marked ? 'Clic para restaurar' : 'Clic para eliminar'}
                          >
                            {marked ? '↩' : '✕'}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}

                {removedImageIds.size > 0 && (
                  <p className="mt-2 text-xs text-red-400">
                    {removedImageIds.size} imagen{removedImageIds.size > 1 ? 'es' : ''} marcada{removedImageIds.size > 1 ? 's' : ''} para eliminar. Se borrará al guardar.
                  </p>
                )}
              </div>

              {/* ── Subir imágenes nuevas ────────────────── */}
              <div>
                <p className="text-sm font-medium text-zinc-300 mb-3">Añadir imágenes nuevas</p>

                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`
                    border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors select-none
                    ${isDragging ? 'border-white bg-zinc-800 text-white' : 'border-zinc-700 hover:border-zinc-500 text-zinc-500 hover:text-zinc-300'}
                  `}
                >
                  <p className="text-sm font-medium">
                    Arrastra imágenes aquí o <span className="underline">haz clic para seleccionar</span>
                  </p>
                  <p className="text-xs mt-1 opacity-60">PNG, JPG, WEBP…</p>
                </div>

                {pendingFiles.length > 0 && (
                  <div className="mt-3 grid grid-cols-4 gap-2">
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
                          className="absolute top-1.5 right-1.5 bg-black/70 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center opacity-100 pointer-fine:opacity-0 pointer-fine:group-hover:opacity-100 focus-visible:opacity-100 pointer-coarse:w-8 pointer-coarse:h-8 transition"
                          aria-label={`Quitar imagen pendiente: ${pf.file.name}`}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Biblioteca (reciclar) ────────────────── */}
              <div>
                <p className="text-sm font-medium text-zinc-300 mb-3">O reutiliza imágenes de la biblioteca</p>

                {loadingLibrary ? (
                  <p className="text-zinc-600 text-sm">Cargando…</p>
                ) : (
                  <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto pr-1">
                    {libraryImages.map((img) => {
                      const alreadyLinked = currentImages.some((ci) => ci.imagen_id === img.id)
                      const selected = selectedLibrary.has(img.id)
                      return (
                        <button
                          key={img.id}
                          type="button"
                          onClick={() => toggleLibrary(img.id)}
                          disabled={alreadyLinked}
                          className={`
                            relative rounded-lg overflow-hidden border-2 transition
                            ${alreadyLinked
                              ? 'opacity-30 cursor-not-allowed border-transparent'
                              : selected ? 'border-white' : 'border-transparent opacity-60 hover:opacity-90'
                            }
                          `}
                          title={alreadyLinked ? 'Ya está en el producto' : ''}
                        >
                          <img src={img.ruta_storage} alt={img.nombre_archivo} className="w-full aspect-square object-cover" />
                          {selected && (
                            <div className="absolute inset-0 bg-white/10 flex items-center justify-center">
                              <span className="text-white text-xl">✓</span>
                            </div>
                          )}
                          {alreadyLinked && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="text-white text-xs bg-black/50 px-1 rounded">Ya añadida</span>
                            </div>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

            </form>

            {/* Footer */}
            <div className="shrink-0 p-6 border-t border-zinc-800 flex justify-between">
              <button
                type="button"
                onClick={closeEdit}
                className="px-5 py-2 text-sm text-zinc-400 hover:text-white transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="edit-form"
                disabled={editLoading}
                className="bg-white text-black px-6 py-2 rounded-lg font-medium hover:bg-zinc-200 transition disabled:opacity-50"
              >
                {editLoading ? 'Guardando…' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirmar eliminación ─────────────────────── */}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setConfirmDelete(null) }}
        >
          <div className="bg-zinc-950 rounded-xl border border-zinc-800 p-8 max-w-sm w-full text-center space-y-5">
            <div className="text-3xl">⚠️</div>
            <h3 className="text-lg font-semibold text-white">¿Eliminar producto?</h3>
            <p className="text-sm text-zinc-400">
              Esta acción no se puede deshacer. El producto se eliminará junto con sus relaciones de imágenes.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="flex-1 px-4 py-2 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition text-sm"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleDelete(confirmDelete)}
                disabled={deleteLoading}
                className="flex-1 px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition text-sm font-medium disabled:opacity-50"
              >
                {deleteLoading ? 'Eliminando…' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}