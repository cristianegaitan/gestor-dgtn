import assert from 'node:assert/strict'
import { createClient } from '@supabase/supabase-js'
import serverless from 'serverless-http'
import { crearApp } from '../../server/app.ts'
import { crearClienteDatosApi } from '../../src/lib/clienteDatosApi.ts'

export function trabajo(id = 1, cliente = 'Prueba') {
  return { id, cliente, servicio: 'Fotografía', fecha: '', estado: 'Planificación', cuentasCobro: [] }
}

export function egreso(id = 'e1', montoCentavos = 10000) {
  return { id, concepto: 'Prueba', montoCentavos, fecha: '2026-11-12', trabajoId: null }
}

export function crearEntorno() {
  const filas = new Map()
  const peticiones = []
  const control = { falloAuth: false, falloDatos: false }
  const clave = (tabla, usuario, id) => `${tabla}:${usuario}:${id}`
  const json = (datos, status = 200) => new Response(JSON.stringify(datos), {
    status, headers: { 'Content-Type': 'application/json' },
  })

  // Se simula solo el servicio externo. Express, serverless-http y supabase-js son reales.
  // No aplica RLS: las pruebas deben detectar si la API olvida filtrar por usuario.
  async function supabaseFalso(entrada, opciones = {}) {
    const url = new URL(entrada)
    const headers = new Headers(opciones.headers)
    const token = headers.get('Authorization')?.replace('Bearer ', '')
    const metodo = opciones.method || 'GET'
    peticiones.push({ url, metodo, token, cuerpo: opciones.body })
    if (url.pathname === '/auth/v1/user') {
      if (control.falloAuth) return json({ msg: 'Servicio no disponible' }, 503)
      if (!['token-usuario-1', 'token-usuario-2'].includes(token)) {
        return json({ msg: 'Token inválido', code: 'bad_jwt' }, 401)
      }
      return json({ id: token.slice(6), aud: 'authenticated', role: 'authenticated' })
    }
    assert.ok(url.pathname.startsWith('/rest/v1/'), url.pathname)
    if (control.falloDatos) return json({ code: 'XX000', message: 'detalle interno privado' }, 503)
    const tabla = url.pathname.split('/').at(-1)
    const filtros = [...url.searchParams.entries()].filter(([, valor]) => valor.startsWith('eq.'))
    const entradas = [...filas.entries()].filter(([llave, fila]) =>
      llave.startsWith(`${tabla}:`) && filtros.every(([campo, valor]) => String(fila[campo]) === valor.slice(3)))
    let data = []
    if (metodo === 'POST') {
      const valores = JSON.parse(opciones.body)
      const llave = clave(tabla, valores.usuario_id, valores.id)
      if (filas.has(llave)) return json({ code: '23505', message: 'duplicado' }, 409)
      filas.set(llave, structuredClone(valores))
      data = [valores]
    } else if (metodo === 'PATCH') {
      const valores = JSON.parse(opciones.body)
      assert.equal(valores.revision, undefined, 'Solo el trigger de la base modifica la revisión')
      for (const [llave, fila] of entradas) {
        const actualizada = { ...fila, ...valores, revision: fila.revision + 1 }
        filas.set(llave, structuredClone(actualizada))
        data.push(actualizada)
      }
    } else if (metodo === 'DELETE') {
      for (const [llave, fila] of entradas) { filas.delete(llave); data.push(fila) }
    } else {
      data = entradas.map(([, fila]) => fila)
      const orden = (url.searchParams.get('order') || '').split(',').map((parte) => parte.split('.')[0])
      data.sort((a, b) => {
        for (const campo of orden) {
          if (a[campo] < b[campo]) return -1
          if (a[campo] > b[campo]) return 1
        }
        return 0
      })
      const offset = Number(url.searchParams.get('offset') || 0)
      const limite = Number(url.searchParams.get('limit') || data.length)
      data = data.slice(offset, offset + limite)
    }
    const seleccion = url.searchParams.get('select')?.split(',')
    if (seleccion) data = data.map((fila) => Object.fromEntries(seleccion.map((campo) => [campo, fila[campo]])))
    return json(data, metodo === 'POST' ? 201 : 200)
  }

  const app = crearApp((token) => createClient('https://prueba.supabase.co', 'clave-publicable-prueba', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { Authorization: `Bearer ${token}` }, fetch: supabaseFalso },
  }))
  const handler = serverless(app)
  async function pedir(ruta, { metodo = 'GET', token = 'token-usuario-1', cuerpo, headers = {} } = {}) {
    const url = new URL(ruta, 'https://gestor.test')
    const respuesta = await handler({
      httpMethod: metodo, path: url.pathname,
      queryStringParameters: Object.fromEntries(url.searchParams),
      headers: {
        ...(token === null ? {} : { authorization: `Bearer ${token}` }),
        ...(cuerpo === undefined ? {} : { 'content-type': 'application/json' }),
        ...headers,
      },
      body: cuerpo === undefined ? '' : typeof cuerpo === 'string' ? cuerpo : JSON.stringify(cuerpo),
      isBase64Encoded: false,
    }, {})
    return {
      estado: respuesta.statusCode,
      headers: new Headers(respuesta.headers),
      texto: respuesta.body,
      datos: respuesta.body ? JSON.parse(respuesta.body) : null,
    }
  }
  function cliente(usuario = 'usuario-1') {
    return crearClienteDatosApi(async () => `token-${usuario}`, async (ruta, opciones) => {
      const headers = new Headers(opciones.headers)
      const respuesta = await pedir(ruta, {
        metodo: opciones.method,
        token: headers.get('Authorization').slice(7),
        cuerpo: opciones.body,
        headers: Object.fromEntries(headers),
      })
      return new Response(respuesta.estado === 204 ? null : respuesta.texto, {
        status: respuesta.estado, headers: respuesta.headers,
      })
    })
  }
  return {
    app, pedir, cliente, control, peticiones,
    sembrar(tabla, datos, orden = 0, usuario = 'usuario-1', revision = 0) {
      filas.set(clave(tabla, usuario, datos.id), { id: datos.id, usuario_id: usuario, datos: structuredClone(datos), orden, revision })
    },
    obtener(tabla, id, usuario = 'usuario-1') { return filas.get(clave(tabla, usuario, id)) },
  }
}
