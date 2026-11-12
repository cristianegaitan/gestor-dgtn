import type { SupabaseClient } from '@supabase/supabase-js'
import type { Egreso, IdRegistro, Trabajo } from '../src/types.ts'
import { conflicto, ErrorApi } from './errores.ts'

export type Tabla = 'trabajos' | 'egresos'
export interface RegistroRemoto {
  datos: Trabajo | Egreso
  revision: number
}

function comprobarError(error: { code?: string } | null) {
  if (!error) return
  if (error.code === '23505') {
    throw new ErrorApi(409, 'REGISTRO_EXISTENTE',
      'El registro ya existe. Recargá antes de volver a guardarlo.')
  }
  if (error.code === '42501') {
    throw new ErrorApi(403, 'ACCESO_DENEGADO', 'No tenés permiso para realizar esta operación.')
  }
  // Los detalles internos de Postgres no se devuelven al navegador.
  throw new ErrorApi(503, 'DATOS_NO_DISPONIBLES',
    'No se pudo acceder a los datos. Intentá nuevamente más tarde.')
}

export function crearRepositorio(cliente: SupabaseClient, usuarioId: string) {
  return {
    async listar(tabla: Tabla, limite: number, offset: number) {
      let consulta = cliente.from(tabla).select('datos, revision').eq('usuario_id', usuarioId)
      if (tabla === 'egresos') consulta = consulta.order('orden')
      const { data, error } = await consulta.order('id').range(offset, offset + limite)
        .overrideTypes<RegistroRemoto[], { merge: false }>()
      comprobarError(error)
      if (!data) throw new ErrorApi(503, 'RESPUESTA_INVALIDA', 'No se pudieron leer los datos.')
      return {
        registros: data.slice(0, limite),
        siguienteOffset: data.length > limite ? offset + limite : null,
      }
    },

    async obtener(tabla: Tabla, id: IdRegistro) {
      const { data, error } = await cliente.from(tabla).select('datos, revision')
        .eq('usuario_id', usuarioId).eq('id', id)
        .overrideTypes<RegistroRemoto[], { merge: false }>()
      comprobarError(error)
      const registro = data?.[0]
      if (!registro) throw new ErrorApi(404, 'REGISTRO_NO_ENCONTRADO', 'No se encontró el registro.')
      return registro
    },

    async guardar(tabla: Tabla, datos: Trabajo | Egreso, revision: number | null, orden?: number) {
      const valores = { datos, ...(orden === undefined ? {} : { orden }) }
      const consulta = revision === null
        ? cliente.from(tabla).insert({ usuario_id: usuarioId, id: datos.id, revision: 0, ...valores })
        : cliente.from(tabla).update(valores)
          .eq('usuario_id', usuarioId).eq('id', datos.id).eq('revision', revision)
      const { data, error } = await consulta.select('revision')
        .overrideTypes<{ revision: number }[], { merge: false }>()
      comprobarError(error)
      const fila = data?.[0]
      if (data?.length !== 1 || !fila) throw conflicto()
      return fila
    },

    async eliminar(tabla: Tabla, id: IdRegistro, revision: number) {
      const { data, error } = await cliente.from(tabla).delete()
        .eq('usuario_id', usuarioId).eq('id', id).eq('revision', revision)
        .select('id').overrideTypes<{ id: IdRegistro }[], { merge: false }>()
      comprobarError(error)
      if (data?.length !== 1) throw conflicto()
    },
  }
}
