import assert from 'node:assert/strict'
import test from 'node:test'
import { crearClienteUsuario } from '../server/configuracion.ts'
import { crearEntorno, trabajo, egreso } from './helpers/api.mjs'

test('salud es pública; los datos requieren una sesión verificada y no se cachean', async () => {
  const entorno = crearEntorno()
  const salud = await entorno.pedir('/api/v1/salud', { token: null })
  assert.equal(salud.estado, 200)
  assert.deepEqual(salud.datos, { estado: 'ok', version: 1 })
  for (const token of [null, 'invalido']) {
    const respuesta = await entorno.pedir('/api/v1/trabajos', { token })
    assert.equal(respuesta.estado, 401)
    assert.equal(respuesta.headers.get('cache-control'), 'no-store')
  }
  assert.equal(entorno.peticiones.some((p) => p.url.pathname.startsWith('/rest/')), false)
})

test('la API distingue sesión inválida de Supabase no disponible y no filtra detalles internos', async () => {
  const entorno = crearEntorno()
  entorno.control.falloAuth = true
  assert.equal((await entorno.pedir('/api/v1/trabajos')).estado, 503)
  entorno.control.falloAuth = false
  entorno.control.falloDatos = true
  const respuesta = await entorno.pedir('/api/v1/trabajos')
  assert.equal(respuesta.estado, 503)
  assert.equal(respuesta.texto.includes('detalle interno privado'), false)
  assert.throws(() => crearClienteUsuario('prueba', {}), /Falta configurar/)
})

test('CRUD REST conserva datos y revisiones, exige If-Match y rechaza una creación duplicada', async () => {
  const e = crearEntorno()
  const original = trabajo()
  const creada = await e.pedir('/api/v1/trabajos', { metodo: 'POST', cuerpo: { datos: original } })
  assert.equal(creada.estado, 201)
  assert.equal(creada.headers.get('location'), '/api/v1/trabajos/1')
  assert.equal(creada.headers.get('etag'), '"0"')
  assert.equal((await e.pedir('/api/v1/trabajos/1')).datos.datos.cliente, 'Prueba')
  assert.equal((await e.pedir('/api/v1/trabajos', { metodo: 'POST', cuerpo: { datos: original } })).estado, 409)
  for (const metodo of ['PUT', 'DELETE']) {
    const respuesta = await e.pedir('/api/v1/trabajos/1', { metodo, cuerpo: { datos: original } })
    assert.equal(respuesta.estado, 428)
  }
  assert.equal(e.obtener('trabajos', 1).revision, 0)
  const actualizada = await e.pedir('/api/v1/trabajos/1', {
    metodo: 'PUT', headers: { 'if-match': '"0"' }, cuerpo: { datos: trabajo(1, 'Editado') },
  })
  assert.equal(actualizada.estado, 200)
  assert.deepEqual(actualizada.datos, { revision: 1 })
  assert.equal(actualizada.headers.get('etag'), '"1"')
  const eliminada = await e.pedir('/api/v1/trabajos/1', { metodo: 'DELETE', headers: { 'if-match': '"1"' } })
  assert.equal(eliminada.estado, 204)
  assert.equal(eliminada.texto, '')
  assert.equal((await e.pedir('/api/v1/trabajos/1')).estado, 404)
})

test('cada usuario solo puede listar, leer, modificar o borrar sus registros', async () => {
  const e = crearEntorno()
  for (const [tabla, datos] of [['trabajos', trabajo()], ['egresos', egreso()]]) {
    e.sembrar(tabla, datos, 0, 'usuario-2')
    const lista = await e.pedir(`/api/v1/${tabla}`)
    assert.deepEqual(lista.datos.registros, [])
    assert.equal((await e.pedir(`/api/v1/${tabla}/${datos.id}`)).estado, 404)
    const cuerpo = { datos, ...(tabla === 'egresos' ? { orden: 0 } : {}) }
    assert.equal((await e.pedir(`/api/v1/${tabla}/${datos.id}`, {
      metodo: 'PUT', headers: { 'if-match': '"0"' }, cuerpo,
    })).estado, 412)
    assert.equal((await e.pedir(`/api/v1/${tabla}/${datos.id}`, {
      metodo: 'DELETE', headers: { 'if-match': '"0"' },
    })).estado, 412)
    assert.equal(e.obtener(tabla, datos.id, 'usuario-2').revision, 0)
  }
  const peticiones = await Promise.all(['usuario-1', 'usuario-2'].map((usuario) => e.cliente(usuario).cargarDatosRemotos()))
  assert.equal(peticiones[0].trabajos.length, 0)
  assert.equal(peticiones[1].trabajos.length, 1)
  const falsificada = await e.pedir('/api/v1/trabajos', {
    metodo: 'POST', cuerpo: { datos: trabajo(2), usuario_id: 'usuario-2' },
  })
  assert.equal(falsificada.estado, 400)
  await e.cliente().guardarTrabajoRemoto(trabajo(2), null)
  assert.equal(e.obtener('trabajos', 2).usuario_id, 'usuario-1')
})

test('la API rechaza importes, fechas, IDs, revisiones, orden y JSON inválidos antes de escribir', async () => {
  const e = crearEntorno()
  const casos = [
    ['/trabajos', { datos: { ...trabajo(), id: -1 } }, {}],
    ['/trabajos', { datos: { ...trabajo(), fechaISO: '2026-02-30' } }, {}],
    ['/egresos', { datos: { ...egreso(), montoCentavos: -1 }, orden: 0 }, {}],
    ['/egresos', { datos: egreso(), orden: 0.5 }, {}],
    ['/trabajos/1', { datos: trabajo(2) }, { 'if-match': '"0"' }],
    ['/trabajos/1', { datos: trabajo() }, { 'if-match': '*' }],
    ['/trabajos/1', { datos: trabajo() }, { 'if-match': '"9007199254740992"' }],
    ['/trabajos', '{json roto', {}],
  ]
  for (const [ruta, cuerpo, headers] of casos) {
    const respuesta = await e.pedir(`/api/v1${ruta}`, { metodo: ruta.endsWith('/1') ? 'PUT' : 'POST', cuerpo, headers })
    assert.equal(respuesta.estado, 400, respuesta.texto)
  }
  assert.equal((await e.pedir('/api/v1/trabajos', { metodo: 'POST', cuerpo: { datos: trabajo() }, headers: { 'content-type': 'text/plain' } })).estado, 415)
  assert.equal((await e.pedir('/api/v1/trabajos', { metodo: 'POST', cuerpo: { datos: trabajo(), extra: 'x'.repeat(1_048_576) } })).estado, 413)
  assert.equal(e.peticiones.some((p) => ['POST', 'PATCH', 'DELETE'].includes(p.metodo)), false)
})

test('la paginación carga más de mil registros y conserva el orden de los egresos', async () => {
  const e = crearEntorno()
  for (let id = 1; id <= 1005; id++) e.sembrar('trabajos', trabajo(id))
  e.sembrar('egresos', egreso('primero'), 0)
  e.sembrar('egresos', egreso('segundo'), 1)
  const datos = await e.cliente().cargarDatosRemotos()
  assert.equal(datos.trabajos.length, 1005)
  assert.equal(datos.trabajos.at(-1).id, 1005)
  assert.deepEqual(datos.egresos.map((r) => r.id), ['primero', 'segundo'])
  for (const query of ['limite=101', 'offset=-1', 'limite=no']) {
    assert.equal((await e.pedir(`/api/v1/trabajos?${query}`)).estado, 400)
  }
})
