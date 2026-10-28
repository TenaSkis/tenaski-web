'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'

type UploadedImage = {
  id: string
  ruta_storage: string
  nombre_archivo: string
}

export default function UploadGalleryImage({
  onUploaded,
}: {
  onUploaded: (image: UploadedImage) => void
}) {
  const [loading, setLoading] = useState(false)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setLoading(true)

    try {
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

      const { data: image, error: imageError } = await supabase
        .from('image')
        .insert({
          nombre_archivo: file.name,
          ruta_storage: data.publicUrl,
          uploaded_by: userData.user.id,
        })
        .select('id, ruta_storage, nombre_archivo')
        .single()

      if (imageError) throw imageError

      onUploaded(image)
    } catch (err: unknown) {
      const error = err as { message?: string }
      console.error(err)
      alert(error?.message || 'Error subiendo imagen')
    } finally {
      setLoading(false)
      e.target.value = ''
    }
  }

  return (
    <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[#C4A882] px-5 py-2.5 text-sm font-semibold text-[#0F0F0F] hover:opacity-90 transition">
      <span>{loading ? 'Subiendo...' : '+ Subir imagen'}</span>
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