'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'

export default function UploadContentImage({
  onUploaded,
}: {
  onUploaded: (imageId: string, ruta: string) => void
}) {
  const [loading, setLoading] = useState(false)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setLoading(true)

    try {
      // Obtenemos el usuario actual para poder rellenar uploaded_by
      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (userError || !userData?.user) {
        throw new Error('No hay sesión activa. Vuelve a iniciar sesión.')
      }

      const fileName = `${Date.now()}-${file.name}`

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      const { data } = supabase.storage
        .from('product-images')
        .getPublicUrl(fileName)

      const imageUrl = data.publicUrl

      const { data: image, error: imageError } = await supabase
        .from('image')
        .insert({
          nombre_archivo: file.name,
          ruta_storage: imageUrl,
          uploaded_by: userData.user.id,
        })
        .select()
        .single()

      if (imageError) throw imageError

      onUploaded(image.id, image.ruta_storage)
    } catch (err: unknown) {
      const error = err as { message?: string }
      console.log('UPLOAD ERROR RAW:', err)
      console.log(JSON.stringify(err, Object.getOwnPropertyNames(error), 2))
      alert(error?.message || 'Error subiendo imagen')
    } finally {
      setLoading(false)
      e.target.value = ''
    }
  }

  return (
    <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-800 transition">
      <span>{loading ? 'Subiendo...' : 'Subir imagen'}</span>

      <input
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        disabled={loading}
        className="hidden"
      />
    </label>
  )
}