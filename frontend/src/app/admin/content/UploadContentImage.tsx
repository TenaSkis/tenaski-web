'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import Notice from '@/components/ui/Notice'
import { ACCEPT_ATTRIBUTE, QUALITY_CONTENT } from '@/lib/images/config'
import {
  getImageErrorMessage,
  getUnsupportedFormatMessage,
  ImageProcessingError,
} from '@/lib/images/errors'
import { uploadAdminImages } from '@/lib/images/uploadAdminImages'

export default function UploadContentImage({
  onUploaded,
}: {
  onUploaded: (imageId: string, ruta: string) => void
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
      // Obtenemos el usuario actual para poder rellenar uploaded_by
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
        quality: QUALITY_CONTENT,
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

      onUploaded(uploaded.id, uploaded.ruta_storage)
    } catch (err: unknown) {
      console.error('UPLOAD ERROR:', err)
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
      <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-800 transition">
        <span>{loading ? (status ?? 'Procesando…') : 'Subir imagen'}</span>

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
