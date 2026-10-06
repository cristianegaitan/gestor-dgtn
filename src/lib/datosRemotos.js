import { supabase } from './supabaseClient'

async function obtenerUsuarioId() {
  const { data, error } = await supabase.auth.getUser()

  if (error) throw error
  if (!data.user) throw new Error('No hay una sesión activa')

  return data.user.id
}

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

export async function guardarTrabajoRemoto(trabajo) {
  const usuarioId = await obtenerUsuarioId()
  const { error } = await supabase.from('trabajos').upsert(
    {
      usuario_id: usuarioId,
      id: trabajo.id,
      datos: trabajo,
    },
    { onConflict: 'usuario_id,id' },
  )

  if (error) throw error
}

export async function guardarEgresoRemoto(egreso, orden) {
  const usuarioId = await obtenerUsuarioId()
  const { error } = await supabase.from('egresos').upsert(
    {
      usuario_id: usuarioId,
      id: egreso.id,
      orden,
      datos: egreso,
    },
    { onConflict: 'usuario_id,id' },
  )

  if (error) throw error
}

export async function eliminarTrabajoRemoto(id) {
  const usuarioId = await obtenerUsuarioId()
  const { error } = await supabase
    .from('trabajos')
    .delete()
    .eq('usuario_id', usuarioId)
    .eq('id', id)

  if (error) throw error
}

export async function eliminarEgresoRemoto(id) {
  const usuarioId = await obtenerUsuarioId()
  const { error } = await supabase
    .from('egresos')
    .delete()
    .eq('usuario_id', usuarioId)
    .eq('id', id)

  if (error) throw error
}