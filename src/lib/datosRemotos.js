import { supabase } from './supabaseClient'

export async function cargarDatosRemotos() {
  const [respuestaTrabajos, respuestaEgresos] = await Promise.all([
    supabase.from('trabajos').select('datos').order('id'),
    supabase.from('egresos').select('datos').order('orden'),
  ])

  if (respuestaTrabajos.error) throw respuestaTrabajos.error
  if (respuestaEgresos.error) throw respuestaEgresos.error

  return {
    trabajos: respuestaTrabajos.data.map((fila) => fila.datos),
    egresos: respuestaEgresos.data.map((fila) => fila.datos),
  }
}