import assert from 'node:assert/strict'
import test from 'node:test'
import { aplicarCambios } from '../src/lib/aplicarCambios.ts'
import { ConflictoRemotoError } from '../src/lib/clienteDatosApi.ts'
import { crearEntorno, trabajo, egreso } from './helpers/api.mjs'

test('una revisión ausente detiene el cambio antes de llamar al guardado o al borrado', async () => {
  const original = [{ id: 99, cliente: 'Original' }]
  const noDebeLlamarse = async () => assert.fail('No debe enviar una escritura sin revisión')
  await assert.rejects(
    aplicarCambios(original, [{ id: 99, cliente: 'Cambio' }], {}, noDebeLlamarse, noDebeLlamarse),
    /No se conoce la revisión/,
  )
  await assert.rejects(
    aplicarCambios(original, [], {}, noDebeLlamarse, noDebeLlamarse),
    /No se conoce la revisión/,
  )
})

test('un cambio de pago desde otro dispositivo no se sobrescribe con una vista anterior', async () => {
  const e = crearEntorno()
  const cliente = e.cliente()
  e.sembrar('trabajos', trabajo())
  const dispositivoA = await cliente.cargarDatosRemotos()
  const dispositivoB = await cliente.cargarDatosRemotos()
  const conPago = [{
    ...dispositivoA.trabajos[0],
    cuentasCobro: [{ id: 'c1', nombre: 'Cuenta', totalCentavos: 10000000, pagos: [{
      id: 'p1', montoCentavos: 7000000, fecha: '2026-11-12', estado: 'Confirmado', medio: '', referencia: '',
    }] }],
  }]
  const revisionesA = await aplicarCambios(
    dispositivoA.trabajos, conPago, dispositivoA.revisionesTrabajos,
    (item, _orden, revision) => cliente.guardarTrabajoRemoto(item, revision), cliente.eliminarTrabajoRemoto,
  )
  assert.equal(revisionesA[1], 1)
  await assert.rejects(
    aplicarCambios(
      dispositivoB.trabajos, [{ ...dispositivoB.trabajos[0], cliente: 'Nombre cambiado' }],
      dispositivoB.revisionesTrabajos,
      (item, _orden, revision) => cliente.guardarTrabajoRemoto(item, revision), cliente.eliminarTrabajoRemoto,
    ), ConflictoRemotoError,
  )
  assert.deepEqual(e.obtener('trabajos', 1).datos.cuentasCobro[0].pagos, conPago[0].cuentasCobro[0].pagos)
  assert.equal(e.obtener('trabajos', 1).datos.cliente, 'Prueba')
  await assert.rejects(cliente.eliminarTrabajoRemoto(1, 0), ConflictoRemotoError)
})

test('un egreso desactualizado tampoco se pisa; un registro distinto puede guardarse', async () => {
  const e = crearEntorno()
  const cliente = e.cliente()
  e.sembrar('egresos', egreso('e1'))
  e.sembrar('egresos', egreso('e2', 20000), 1)
  const vista = await cliente.cargarDatosRemotos()
  assert.equal(await cliente.guardarEgresoRemoto(egreso('e1', 15000), 0, vista.revisionesEgresos.e1), 1)
  await assert.rejects(
    cliente.guardarEgresoRemoto(egreso('e1', 5000), 0, vista.revisionesEgresos.e1), ConflictoRemotoError,
  )
  assert.equal(e.obtener('egresos', 'e1').datos.montoCentavos, 15000)
  assert.equal(await cliente.guardarEgresoRemoto(egreso('e2', 25000), 1, vista.revisionesEgresos.e2), 1)
})

test('un registro nuevo obtiene revisión y solo se elimina con esa revisión', async () => {
  const e = crearEntorno()
  const cliente = e.cliente()
  assert.equal(await cliente.guardarTrabajoRemoto(trabajo(2, 'Nuevo'), null), 0)
  await assert.rejects(cliente.guardarTrabajoRemoto(trabajo(2, 'Duplicado'), null), ConflictoRemotoError)
  assert.equal(await cliente.guardarTrabajoRemoto(trabajo(2, 'Editado'), 0), 1)
  await assert.rejects(cliente.eliminarTrabajoRemoto(2, 0), ConflictoRemotoError)
  await cliente.eliminarTrabajoRemoto(2, 1)
  assert.equal(e.obtener('trabajos', 2), undefined)
})
