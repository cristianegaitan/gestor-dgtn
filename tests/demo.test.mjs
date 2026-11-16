import assert from 'node:assert/strict'
import test from 'node:test'
import { crearDatosEjemplo } from '../src/demo/datosEjemplo.ts'
import { CLAVE_DEMO, crearAlmacenDemo } from '../src/demo/almacenDemo.ts'
import { esRutaDemo } from '../src/demo/rutaDemo.ts'
import { esRespaldoValido } from '../src/lib/validaciones.ts'

function almacenamiento() {
  const valores = new Map([['sb-sesion-privada', 'sesion-ficticia-para-prueba']])
  const lecturas = []
  const escrituras = []
  return {
    valores, lecturas, escrituras,
    getItem(clave) { lecturas.push(clave); return valores.get(clave) ?? null },
    setItem(clave, valor) { escrituras.push(clave); valores.set(clave, valor) },
  }
}

test('los ejemplos cumplen el formato del gestor y sus fechas se adaptan al cambio de año', () => {
  const datos = crearDatosEjemplo(new Date('2026-12-24T12:00:00Z'))
  assert.equal(esRespaldoValido(datos), true)
  assert.equal(datos.trabajos[0].fechaISO, '2027-01-07')
  assert.equal(datos.trabajos[1].fechaISO, '2027-01-23')
  assert.deepEqual(datos.trabajos.map((t) => t.cuentasCobro[0].pagos[0].estado), ['Confirmado', 'Pendiente', 'Confirmado'])
})

test('los cambios de demo se recuperan al recargar y no leen ni sobrescriben otras claves', () => {
  const disco = almacenamiento()
  const demo = crearAlmacenDemo(disco)
  demo.setTrabajos((anteriores) => anteriores.map((t) => ({ ...t, cliente: 'Nombre de prueba' })))
  demo.setEgresos([])
  const recargada = crearAlmacenDemo(disco).getSnapshot().datos
  assert.equal(recargada.trabajos[0].cliente, 'Nombre de prueba')
  assert.deepEqual(recargada.egresos, [])
  assert.ok(disco.lecturas.every((clave) => clave === CLAVE_DEMO))
  assert.ok(disco.escrituras.every((clave) => clave === CLAVE_DEMO))
  assert.equal(disco.valores.get('sb-sesion-privada'), 'sesion-ficticia-para-prueba')
})

test('dos sesiones de demo independientes no comparten modificaciones', () => {
  const sesionA = almacenamiento()
  const sesionB = almacenamiento()
  const a = crearAlmacenDemo(sesionA)
  a.setTrabajos([])
  assert.equal(crearAlmacenDemo(sesionA).getSnapshot().datos.trabajos.length, 0)
  assert.equal(crearAlmacenDemo(sesionB).getSnapshot().datos.trabajos.length, 3)
})

test('una demo dañada o un almacenamiento bloqueado permiten continuar con datos válidos', () => {
  for (const valor of ['{json roto', JSON.stringify({ version: 1, trabajos: 'invalido', egresos: [] })]) {
    const disco = almacenamiento()
    disco.setItem(CLAVE_DEMO, valor)
    const demo = crearAlmacenDemo(disco)
    assert.equal(esRespaldoValido(demo.getSnapshot().datos), true)
    assert.match(demo.getSnapshot().aviso, /cargaron los ejemplos/)
  }
  const bloqueado = crearAlmacenDemo({ getItem: () => null, setItem: () => { throw new Error('Cuota agotada') } })
  bloqueado.setTrabajos([])
  assert.deepEqual(bloqueado.getSnapshot().datos.trabajos, [])
  assert.match(bloqueado.getSnapshot().aviso, /hasta que recargues/)
  const sinAlmacenamiento = crearAlmacenDemo(null)
  sinAlmacenamiento.setEgresos([])
  assert.deepEqual(sinAlmacenamiento.getSnapshot().datos.egresos, [])
})

test('reiniciar la demo recupera los ejemplos y no elimina la sesión privada', () => {
  const disco = almacenamiento()
  const demo = crearAlmacenDemo(disco)
  demo.setTrabajos([])
  demo.setEgresos([])
  demo.reiniciar()
  assert.equal(demo.getSnapshot().datos.trabajos.length, 3)
  assert.equal(demo.getSnapshot().datos.egresos.length, 3)
  assert.equal(crearAlmacenDemo(disco).getSnapshot().datos.trabajos.length, 3)
  assert.equal(disco.valores.get('sb-sesion-privada'), 'sesion-ficticia-para-prueba')
})

test('solo /demo y /demo/ eligen el acceso público de demostración', () => {
  assert.equal(esRutaDemo('/demo'), true)
  assert.equal(esRutaDemo('/demo/'), true)
  for (const ruta of ['/', '/demo-privada', '/demo/otro', '/api/v1/trabajos']) assert.equal(esRutaDemo(ruta), false)
})
