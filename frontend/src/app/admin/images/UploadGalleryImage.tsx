'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import Notice from '@/components/ui/Notice'
import { ACCEPT_ATTRIBUTE, QUALITY_PRODUCT } from '@/lib/images/config'
import {
  getImageErrorMessage,
  getUnsupportedFormatMessage,
  ImageProcessingError,
} from '@/lib/images/errors'
import { uploadAdminImages } from '@/lib/images/uploadAdminImages'

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
  const [status, setStatus] = useState<string | null>(null)
  const [formatNotice, setFormatNotice] = useState<string | null>(null)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setFormatNotice(null)
    setLoading(true)
    setStatus('Preparando…')

    try {
      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (userError || !userData?.user) {
        throw new ImageProcessingError(
          'NOT_AUTHENTICATED',
          'No hay sesión activa. Vuelve a iniciar sesión.'
        )
      }

      const [uploaded] = await uploadAdminImages({
        files: [file],
        userId: userData.user.id,
        quality: QUALITY_PRODUCT,
        client: supabase,
        onProgress: (progress) => {
          setStatus(
            progress.phase === 'converting'
              ? 'Convirtiendo a WebP…'
              : 'Subiendo…'
          )
        },
      })

      if (!uploaded) {
        throw new ImageProcessingError(
          'UPLOAD_FAILED',
          'No se pudo completar la subida de la imagen.'
        )
      }

      onUploaded({
        id: uploaded.id,
        ruta_storage: uploaded.ruta_storage,
        nombre_archivo: uploaded.nombre_archivo,
      })
    } catch (err: unknown) {
      console.error(err)
      const formatMessage = getUnsupportedFormatMessage(err)
      if (formatMessage) {
        setFormatNotice(formatMessage)
        return
      }
      alert(getImageErrorMessage(err))
    } finally {
      setLoading(false)
      setStatus(null)
      e.target.value = ''
    }
  }

  return (
    <>
      <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[#C4A882] px-5 py-2.5 text-sm font-semibold text-[#0F0F0F] hover:opacity-90 transition">
        <span>{loading ? (status ?? 'Procesando…') : '+ Subir imagen'}</span>
        <input
          type="file"
          accept={ACCEPT_ATTRIBUTE}
          onChange={handleFileChange}
          disabled={loading}
          className="hidden"
        />
      </label>

      {formatNotice && (
        <Notice
          title="Formato no admitido"
          message={formatNotice}
          onClose={() => setFormatNotice(null)}
          className="mt-2"
        />
      )}
    </>
  )
}
