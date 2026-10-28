'use server'
// app/admin/content/actions.ts

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function updateContentBlock(
  seccion: string,
  data: Record<string, unknown>,
  imagenId?: string | null
) {
  const supabase = await createClient()

  const updatePayload: Record<string, unknown> = {
    data,
    updated_at: new Date().toISOString(),
  }

  if (imagenId) {
    updatePayload.imagen_id = imagenId
  }

  const { data: updatedRows, error } = await supabase
    .from('content_block')
    .update(updatePayload)
    .eq('seccion', seccion)
    .select('id')

  if (error) {
    console.error('Error actualizando content_block:', error)
    throw new Error(error.message)
  }

  const rowsCount = Array.isArray(updatedRows) ? updatedRows.length : updatedRows ? 1 : 0

  if (rowsCount === 0) {
    const { error: insertError } = await supabase
      .from('content_block')
      .insert({
        seccion,
        data,
        imagen_id: imagenId ?? null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })

    if (insertError) {
      console.error('Error insertando content_block:', insertError)
      throw new Error(insertError.message)
    }
  }

  revalidatePath('/admin/content')
  revalidatePath('/')
  revalidatePath('/historia')
  revalidatePath('/catalogo')
  revalidatePath('/galeria')
  revalidatePath('/contacto')
}

/**
 * Crea un nuevo acabado (imagen + nombre + descripción breve).
 * Si esPremium es true, se guarda con su precio extra.
 * sinGrabado: por defecto false → el cliente SÍ puede personalizar
 * espátula/cola. Si se marca true, el DesignModal ocultará esas opciones
 * cuando el cliente elija este acabado.
 */
export async function createAcabado(
  nombre: string,
  descripcion: string,
  imagenId: string,
  orden: number,
  esPremium: boolean = false,
  precioExtra: number | null = null,
  sinGrabado: boolean = false
) {
  const supabase = await createClient()

  const { error } = await supabase.from('acabado').insert({
    nombre,
    descripcion,
    imagen_id: imagenId,
    orden,
    es_premium: esPremium,
    precio_extra: esPremium ? precioExtra : null,
    sin_grabado: sinGrabado,
  })

  if (error) {
    console.error('Error creando acabado:', error)
    throw new Error(error.message)
  }

  revalidatePath('/admin/content')
  revalidatePath('/')
}

/**
 * Actualiza el nombre y la descripción de un acabado existente.
 */
export async function updateAcabado(
  id: string,
  nombre: string,
  descripcion: string
) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('acabado')
    .update({
      nombre,
      descripcion,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) {
    console.error('Error actualizando acabado:', error)
    throw new Error(error.message)
  }

  revalidatePath('/admin/content')
  revalidatePath('/')
}

/**
 * Activa/desactiva el flag "sin grabado" de un acabado.
 * Cuando está activo, ese acabado no permite añadir imágenes/texto
 * en espátula o cola dentro del DesignModal.
 */
export async function toggleAcabadoSinGrabado(id: string, sinGrabado: boolean) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('acabado')
    .update({
      sin_grabado: sinGrabado,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) {
    console.error('Error actualizando sin_grabado:', error)
    throw new Error(error.message)
  }

  revalidatePath('/admin/content')
  revalidatePath('/')
}

/**
 * Elimina un acabado.
 */
export async function deleteAcabado(id: string) {
  const supabase = await createClient()

  const { error } = await supabase.from('acabado').delete().eq('id', id)

  if (error) {
    console.error('Error eliminando acabado:', error)
    throw new Error(error.message)
  }

  revalidatePath('/admin/content')
  revalidatePath('/')
}