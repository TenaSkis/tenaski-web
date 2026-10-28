import type { PostgrestSingleResponse } from '@supabase/supabase-js'

/**
 * Envuelve una query de Supabase para poder meterla en un `Promise.all`
 * sin que un fallo tumbe la página entera.
 *
 * Comportamiento idéntico al de antes: supabase-js no lanza excepciones,
 * devuelve `{ data: null, error }`. Este helper solo añade la red de
 * seguridad por si la capa de red falla, y normaliza `undefined` a `null`
 * para que los `??` de siempre sigan funcionando igual.
 *
 * Se conserva `error` para que las páginas que lo usan para logarith
 * (p.ej. `console.error` en catalogo) sigan funcionando.
 *
 * Uso:
 *   const [{ data: a }, { data: b }] = await Promise.all([
 *     safe(supabase.from('x').select('*')),
 *     safe(supabase.from('y').select('*')),
 *   ])
 */
export async function safe<T>(
  query: PromiseLike<PostgrestSingleResponse<T>>
): Promise<{ data: T | null; error: { message: string } | null }> {
  try {
    const res = await query
    return { data: res.data ?? null, error: res.error ?? null }
  } catch (e) {
    return {
      data: null,
      error: {
        message: e instanceof Error ? e.message : 'Error desconocido',
      },
    }
  }
}