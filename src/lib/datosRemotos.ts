import { supabase } from './supabaseClient'
import type { DatosRemotos, Egreso, IdRegistro, Trabajo } from '../types'

type TablaRemota = 'trabajos' | 'egresos'
interface FilaRemota<T> {
  datos: T
  revision: number
}
interface FilaRevision {
  revision: number
}

function obtenerRevisionGuardada(data: FilaRevision[] | null): number {
  const fila = data?.[0]
  if (data?.length !== 1 || !fila) throw new ConflictoRemotoError()
  return fila.revision
}

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

export async function cargarDatosRemotos(): Promise<DatosRemotos> {
  const [respuestaTrabajos, respuestaEgresos] = await Promise.all([
    supabase.from('trabajos').select('datos, revision').order('id')
      .overrideTypes<FilaRemota<Trabajo>[], { merge: false }>(),
    supabase.from('egresos').select('datos, revision').order('orden')
      .overrideTypes<FilaRemota<Egreso>[], { merge: false }>(),
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

async function guardarRegistro(
  tabla: TablaRemota,
  registro: Trabajo | Egreso,
  revision: number | null,
  orden?: number,
): Promise<number> {
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
    }).select('revision').overrideTypes<FilaRevision[], { merge: false }>()

    if (error?.code === '23505') throw new ConflictoRemotoError()
    if (error) throw error
    return obtenerRevisionGuardada(data)
  }

  const { data, error } = await supabase.from(tabla)
    .update(valores)
    .eq('usuario_id', usuarioId)
    .eq('id', registro.id)
    .eq('revision', revision)
    .select('revision')
    .overrideTypes<FilaRevision[], { merge: false }>()

  if (error) throw error
  return obtenerRevisionGuardada(data)
}

export function guardarTrabajoRemoto(trabajo: Trabajo, revision: number | null) {
  return guardarRegistro('trabajos', trabajo, revision)
}

export function guardarEgresoRemoto(egreso: Egreso, orden: number, revision: number | null) {
  return guardarRegistro('egresos', egreso, revision, orden)
}

async function eliminarRegistro(tabla: TablaRemota, id: IdRegistro, revision: number): Promise<void> {
  const usuarioId = await obtenerUsuarioId()
  const { data, error } = await supabase
    .from(tabla)
    .delete()
    .eq('usuario_id', usuarioId)
    .eq('id', id)
    .eq('revision', revision)
    .select('id')
    .overrideTypes<{ id: IdRegistro }[], { merge: false }>()

  if (error) throw error
  if (data?.length !== 1) throw new ConflictoRemotoError()
}

export function eliminarTrabajoRemoto(id: number, revision: number) {
  return eliminarRegistro('trabajos', id, revision)
}

export function eliminarEgresoRemoto(id: string, revision: number) {
  return eliminarRegistro('egresos', id, revision)
}
