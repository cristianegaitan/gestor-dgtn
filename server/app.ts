import express from 'express'
import type { ErrorRequestHandler, Request } from 'express'
import { esEgresoValido, esTrabajoValido } from '../src/lib/validaciones.ts'
import { crearClienteUsuario } from './configuracion.ts'
import { ErrorApi } from './errores.ts'
import { crearRepositorio } from './repositorio.ts'
import type { Tabla } from './repositorio.ts'

function enteroConsulta(valor: unknown, defecto: number, minimo: number, maximo: number) {
  if (valor === undefined) return defecto
  if (typeof valor !== 'string' || !/^\d+$/.test(valor)) {
    throw new ErrorApi(400, 'PAGINACION_INVALIDA', 'La paginación debe usar números enteros.')
  }
  const numero = Number(valor)
  if (!Number.isSafeInteger(numero) || numero < minimo || numero > maximo) {
    throw new ErrorApi(400, 'PAGINACION_INVALIDA', 'La paginación está fuera del rango permitido.')
  }
  return numero
}

function leerId(req: Request, tabla: Tabla) {
  const id = req.params.id
  if (typeof id !== 'string' || id.length === 0 || id.length > 200) {
    throw new ErrorApi(400, 'ID_INVALIDO', 'El identificador no es válido.')
  }
  if (tabla === 'egresos') return id
  const numero = Number(id)
  if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(numero)) {
    throw new ErrorApi(400, 'ID_INVALIDO', 'El identificador del trabajo no es válido.')
  }
  return numero
}

function leerRevision(req: Request): number {
  const cabecera = req.get('If-Match')
  if (cabecera === undefined) {
    throw new ErrorApi(428, 'REVISION_REQUERIDA', 'Enviá la revisión actual mediante If-Match.')
  }
  const coincidencia = /^"(\d+)"$/.exec(cabecera)
  const revision = coincidencia ? Number(coincidencia[1]) : NaN
  if (!Number.isSafeInteger(revision) || revision < 0) {
    throw new ErrorApi(400, 'REVISION_INVALIDA', 'If-Match debe contener una revisión entre comillas.')
  }
  return revision
}

function leerCuerpo(req: Request, tabla: Tabla) {
  const cuerpo: unknown = req.body
  if (typeof cuerpo !== 'object' || cuerpo === null || Array.isArray(cuerpo)) {
    throw new ErrorApi(400, 'DATOS_INVALIDOS', 'Enviá un objeto JSON con el campo datos.')
  }
  const campos = cuerpo as Record<string, unknown>
  const permitidos = tabla === 'egresos' ? ['datos', 'orden'] : ['datos']
  if (Object.keys(campos).some((campo) => !permitidos.includes(campo))) {
    throw new ErrorApi(400, 'CAMPOS_NO_PERMITIDOS', 'La petición contiene campos no permitidos.')
  }
  const datos = campos.datos
  const valido = tabla === 'trabajos' ? esTrabajoValido(datos) : esEgresoValido(datos)
  if (!valido || (!esTrabajoValido(datos) && !esEgresoValido(datos))) {
    throw new ErrorApi(400, 'DATOS_INVALIDOS', 'Los datos del registro no son válidos.')
  }
  if (typeof datos.id === 'string' && (datos.id.length === 0 || datos.id.length > 200)) {
    throw new ErrorApi(400, 'ID_INVALIDO', 'El identificador no es válido.')
  }
  const orden = campos.orden
  if (tabla === 'egresos' && (typeof orden !== 'number' || !Number.isSafeInteger(orden) || orden < 0)) {
    throw new ErrorApi(400, 'ORDEN_INVALIDO', 'El egreso debe incluir un orden entero no negativo.')
  }
  return { datos, orden: typeof orden === 'number' ? orden : undefined }
}

export function crearApp(crearCliente = crearClienteUsuario) {
  const app = express()
  app.disable('x-powered-by')
  app.disable('etag')
  app.use((_req, res, next) => {
    res.set('Cache-Control', 'no-store')
    res.set('X-Content-Type-Options', 'nosniff')
    next()
  })
  // Indica que el proceso responde; no comprueba la disponibilidad de Supabase.
  app.get('/api/v1/salud', (_req, res) => { res.json({ estado: 'ok', version: 1 }) })

  const api = express.Router()
  api.use(async (req, res, next) => {
    const coincidencia = /^Bearer ([^\s]+)$/i.exec(req.get('Authorization') || '')
    const token = coincidencia?.[1]
    if (!token) throw new ErrorApi(401, 'SESION_REQUERIDA', 'Iniciá sesión para acceder a los datos.')
    const cliente = crearCliente(token)
    const { data, error } = await cliente.auth.getUser(token)
    if (error && (!error.status || error.status >= 500 || error.status === 429)) {
      throw new ErrorApi(503, 'AUTENTICACION_NO_DISPONIBLE',
        'No se pudo comprobar la sesión. Intentá nuevamente más tarde.')
    }
    if (error || !data.user) {
      res.set('WWW-Authenticate', 'Bearer')
      throw new ErrorApi(401, 'SESION_INVALIDA', 'La sesión venció o no es válida. Volvé a ingresar.')
    }
    res.locals.repositorio = crearRepositorio(cliente, data.user.id)
    next()
  })
  api.use((req, _res, next) => {
    if (['POST', 'PUT'].includes(req.method) && !req.is('application/json')) {
      throw new ErrorApi(415, 'JSON_REQUERIDO', 'El contenido debe ser application/json.')
    }
    next()
  })
  api.use(express.json({ limit: '1mb' }))

  for (const tabla of ['trabajos', 'egresos'] as const) {
    const ruta = `/${tabla}`
    api.get(ruta, async (req, res) => {
      const limite = enteroConsulta(req.query.limite, 100, 1, 100)
      const offset = enteroConsulta(req.query.offset, 0, 0, Number.MAX_SAFE_INTEGER - 100)
      const repositorio = res.locals.repositorio as ReturnType<typeof crearRepositorio>
      res.json(await repositorio.listar(tabla, limite, offset))
    })
    api.get(`${ruta}/:id`, async (req, res) => {
      const id = leerId(req, tabla)
      const repositorio = res.locals.repositorio as ReturnType<typeof crearRepositorio>
      const registro = await repositorio.obtener(tabla, id)
      res.set('ETag', `"${registro.revision}"`).json(registro)
    })
    api.post(ruta, async (req, res) => {
      const { datos, orden } = leerCuerpo(req, tabla)
      const repositorio = res.locals.repositorio as ReturnType<typeof crearRepositorio>
      const resultado = await repositorio.guardar(tabla, datos, null, orden)
      res.status(201).location(`/api/v1/${tabla}/${encodeURIComponent(datos.id)}`)
        .set('ETag', `"${resultado.revision}"`).json(resultado)
    })
    api.put(`${ruta}/:id`, async (req, res) => {
      const id = leerId(req, tabla)
      const revision = leerRevision(req)
      const { datos, orden } = leerCuerpo(req, tabla)
      if (id !== datos.id) throw new ErrorApi(400, 'ID_DISTINTO', 'El ID de la URL y del contenido deben coincidir.')
      const repositorio = res.locals.repositorio as ReturnType<typeof crearRepositorio>
      const resultado = await repositorio.guardar(tabla, datos, revision, orden)
      res.set('ETag', `"${resultado.revision}"`).json(resultado)
    })
    api.delete(`${ruta}/:id`, async (req, res) => {
      const id = leerId(req, tabla)
      const revision = leerRevision(req)
      const repositorio = res.locals.repositorio as ReturnType<typeof crearRepositorio>
      await repositorio.eliminar(tabla, id, revision)
      res.status(204).end()
    })
  }
  app.use('/api/v1', api)
  app.use((_req, res) => {
    res.status(404).json({ error: { codigo: 'RUTA_NO_ENCONTRADA', mensaje: 'La ruta no existe.' } })
  })
  const manejarError: ErrorRequestHandler = (error: unknown, _req, res, next) => {
    if (res.headersSent) { next(error); return }
    if (error instanceof ErrorApi) {
      res.status(error.estado).json({ error: { codigo: error.codigo, mensaje: error.message } })
      return
    }
    const tipo = typeof error === 'object' && error !== null && 'type' in error ? error.type : undefined
    if (tipo === 'entity.parse.failed' || tipo === 'entity.too.large') {
      res.status(tipo === 'entity.too.large' ? 413 : 400).json({
        error: { codigo: 'JSON_INVALIDO', mensaje: 'El JSON es inválido o supera el límite de 1 MB.' },
      })
      return
    }
    res.status(500).json({ error: { codigo: 'ERROR_INTERNO', mensaje: 'No se pudo completar la operación.' } })
  }
  app.use(manejarError)
  return app
}
