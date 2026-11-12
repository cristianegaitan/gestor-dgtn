import type { DatosRemotos, Egreso, IdRegistro, Trabajo } from '../types.ts'
import { esEgresoValido, esTrabajoValido } from './validaciones.ts'

type Tabla = 'trabajos' | 'egresos'
interface Registro<T> { datos: T; revision: number }

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor)
}

function esRevision(valor: unknown): valor is number {
  return typeof valor === 'number' && Number.isSafeInteger(valor) && valor >= 0
}

export class ConflictoRemotoError extends Error {
  constructor() {
    super('Este registro cambió en otro dispositivo. Recargá antes de modificarlo.')
    this.name = 'ConflictoRemotoError'
  }
}

export function crearClienteDatosApi(
  obtenerToken: () => Promise<string>,
  enviar: typeof fetch = fetch,
) {
  async function solicitar(ruta: string, metodo = 'GET', cuerpo?: unknown, revision?: number) {
    const token = await obtenerToken()
    const respuesta = await enviar(`/api/v1/${ruta}`, {
      method: metodo,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(cuerpo === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(revision === undefined ? {} : { 'If-Match': `"${revision}"` }),
      },
      ...(cuerpo === undefined ? {} : { body: JSON.stringify(cuerpo) }),
      cache: 'no-store',
      signal: AbortSignal.timeout(20_000),
    })
    if (respuesta.status === 409 || respuesta.status === 412) throw new ConflictoRemotoError()
    if (respuesta.status === 204) return null
    const contenido: unknown = await respuesta.json()
    if (!respuesta.ok) {
      const mensaje = esObjeto(contenido) && esObjeto(contenido.error) &&
        typeof contenido.error.mensaje === 'string' ? contenido.error.mensaje : 'No se pudo acceder a la API.'
      throw new Error(mensaje)
    }
    return contenido
  }

  async function cargarColeccion<T>(tabla: Tabla, esValido: (valor: unknown) => valor is T) {
    const registros: Registro<T>[] = []
    let offset = 0
    while (true) {
      const pagina = await solicitar(`${tabla}?limite=100&offset=${offset}`)
      if (!esObjeto(pagina) || !Array.isArray(pagina.registros)) {
        throw new Error('La API devolvió una respuesta inválida.')
      }
      for (const registro of pagina.registros) {
        if (!esObjeto(registro) || !esValido(registro.datos) || !esRevision(registro.revision)) {
          throw new Error('La API devolvió un registro inválido. Se detuvo la carga.')
        }
        registros.push({ datos: registro.datos, revision: registro.revision })
      }
      if (pagina.siguienteOffset === null) return registros
      if (pagina.registros.length === 0 || pagina.siguienteOffset !== offset + pagina.registros.length) {
        throw new Error('La API devolvió una paginación inválida.')
      }
      offset = pagina.siguienteOffset as number
    }
  }

  async function guardar(tabla: Tabla, datos: Trabajo | Egreso, revision: number | null, orden?: number) {
    const nuevo = revision === null
    const ruta = nuevo ? tabla : `${tabla}/${encodeURIComponent(datos.id)}`
    const resultado = await solicitar(ruta, nuevo ? 'POST' : 'PUT', {
      datos, ...(orden === undefined ? {} : { orden }),
    }, revision ?? undefined)
    if (!esObjeto(resultado) || !esRevision(resultado.revision)) {
      throw new Error('La API no confirmó la revisión guardada. Recargá antes de continuar.')
    }
    return resultado.revision
  }

  async function eliminar(tabla: Tabla, id: IdRegistro, revision: number) {
    await solicitar(`${tabla}/${encodeURIComponent(id)}`, 'DELETE', undefined, revision)
  }

  return {
    async cargarDatosRemotos(): Promise<DatosRemotos> {
      const [trabajos, egresos] = await Promise.all([
        cargarColeccion('trabajos', esTrabajoValido),
        cargarColeccion('egresos', esEgresoValido),
      ])
      if (new Set(trabajos.map((r) => r.datos.id)).size !== trabajos.length ||
        new Set(egresos.map((r) => r.datos.id)).size !== egresos.length) {
        throw new Error('Los datos cambiaron durante la carga. Recargá la página.')
      }
      return {
        trabajos: trabajos.map((registro) => registro.datos),
        egresos: egresos.map((registro) => registro.datos),
        revisionesTrabajos: Object.fromEntries(trabajos.map((r) => [r.datos.id, r.revision])),
        revisionesEgresos: Object.fromEntries(egresos.map((r) => [r.datos.id, r.revision])),
      }
    },
    guardarTrabajoRemoto: (trabajo: Trabajo, revision: number | null) => guardar('trabajos', trabajo, revision),
    guardarEgresoRemoto: (egreso: Egreso, orden: number, revision: number | null) =>
      guardar('egresos', egreso, revision, orden),
    eliminarTrabajoRemoto: (id: number, revision: number) => eliminar('trabajos', id, revision),
    eliminarEgresoRemoto: (id: string, revision: number) => eliminar('egresos', id, revision),
  }
}
