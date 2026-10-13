import { supabase } from './supabaseClient'

export class ConflictoRemotoError extends Error {
  constructor() {
    super('Este registro cambió en otro dispositivo. Recargá antes de modificarlo.')
    this.name = 'ConflictoRemotoError'
  }
}

async function obtenerUsuarioId() {
  const { data, error } = await supabase.auth.getUser()

  if (error) throw error
  if (!data.user) throw new Error('No hay una sesión activa')

  return data.user.id
}

export async function cargarDatosRemotos() {
  const [respuestaTrabajos, respuestaEgresos] = await Promise.all([
    supabase.from('trabajos').select('datos, revision').order('id'),
    supabase.from('egresos').select('datos, revision').order('orden'),
  ])

  if (respuestaTrabajos.error) throw respuestaTrabajos.error
  if (respuestaEgresos.error) throw respuestaEgresos.error

  return {
    trabajos: respuestaTrabajos.data.map((fila) => fila.datos),
    egresos: respuestaEgresos.data.map((fila) => fila.datos),
    revisionesTrabajos: Object.fromEntries(
      respuestaTrabajos.data.map((fila) => [fila.datos.id, fila.revision]),
    ),
    revisionesEgresos: Object.fromEntries(
      respuestaEgresos.data.map((fila) => [fila.datos.id, fila.revision]),
    ),
  }
}

async function guardarRegistro(tabla, registro, revision, orden) {
  const usuarioId = await obtenerUsuarioId()
  const valores = {
    datos: registro,
    ...(orden === undefined ? {} : { orden }),
  }

  if (revision === null) {
    const { data, error } = await supabase.from(tabla).insert({
      usuario_id: usuarioId,
      id: registro.id,
      revision: 0,
      ...valores,
    }).select('revision')

    if (error?.code === '23505') throw new ConflictoRemotoError()
    if (error) throw error
    if (data?.length !== 1) throw new ConflictoRemotoError()
    return data[0].revision
  }

  const { data, error } = await supabase.from(tabla)
    .update(valores)
    .eq('usuario_id', usuarioId)
    .eq('id', registro.id)
    .eq('revision', revision)
    .select('revision')

  if (error) throw error
  if (data?.length !== 1) throw new ConflictoRemotoError()
  return data[0].revision
}

export function guardarTrabajoRemoto(trabajo, revision) {
  return guardarRegistro('trabajos', trabajo, revision)
}

export function guardarEgresoRemoto(egreso, orden, revision) {
  return guardarRegistro('egresos', egreso, revision, orden)
}

async function eliminarRegistro(tabla, id, revision) {
  const usuarioId = await obtenerUsuarioId()
  const { data, error } = await supabase
    .from(tabla)
    .delete()
    .eq('usuario_id', usuarioId)
    .eq('id', id)
    .eq('revision', revision)
    .select('id')

  if (error) throw error
  if (data?.length !== 1) throw new ConflictoRemotoError()
}

export function eliminarTrabajoRemoto(id, revision) {
  return eliminarRegistro('trabajos', id, revision)
}

export function eliminarEgresoRemoto(id, revision) {
  return eliminarRegistro('egresos', id, revision)
}
