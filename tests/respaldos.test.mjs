import assert from 'node:assert/strict'
import test from 'node:test'
import { esFechaISOValida, esRespaldoValido } from '../src/lib/validaciones.ts'

function crearRespaldo() {
  return {
    version: 1,
    fechaRespaldo: '2026-11-11T12:00:00.000Z',
    trabajos: [{
      id: 1, cliente: 'Cliente de prueba', servicio: 'Fotografía',
      fecha: '11 de noviembre de 2026', fechaISO: '2026-11-11',
      estado: 'Planificación', estadoContrato: 'Pendiente',
      enlaceDrive: '', enlacePixieset: '', fechaEnlacesEnviados: '',
      estadoPendrive: 'No corresponde',
      cuentasCobro: [{
        id: 'cuenta-1', nombre: 'Cuenta de prueba', totalCentavos: 100000,
        pagos: [{
          id: 'pago-1', montoCentavos: 70000, fecha: '2026-11-11',
          medio: 'Transferencia', referencia: '', estado: 'Confirmado',
        }],
      }],
    }],
    egresos: [{
      id: 'egreso-1', concepto: 'Impresiones', montoCentavos: 5000,
      fecha: '2026-11-11', trabajoId: 1,
    }],
  }
}

test('un respaldo completo conserva trabajos, cuentas, pagos y egresos al leer su JSON', () => {
  const respaldo = crearRespaldo()
  const leido = JSON.parse(JSON.stringify(respaldo))
  assert.equal(esRespaldoValido(leido), true)
  assert.deepEqual(leido, respaldo)
})

test('se mantienen compatibles los respaldos antiguos sin campos opcionales', () => {
  const respaldo = {
    version: 1,
    trabajos: [{ id: 1, cliente: 'Antiguo', servicio: 'Video', fecha: '', estado: 'Confirmado' }],
    egresos: [],
  }
  assert.equal(esRespaldoValido(respaldo), true)
  respaldo.trabajos[0].cuentasCobro = [{ id: 'cuenta', nombre: 'Sin pagos', totalCentavos: null }]
  assert.equal(esRespaldoValido(respaldo), true)
})

test('datos externos con estructura o campos opcionales incorrectos se rechazan', () => {
  for (const valor of [null, [], {}, { version: 2, trabajos: [], egresos: [] }]) {
    assert.equal(esRespaldoValido(valor), false)
  }
  for (const campo of ['enlaceDrive', 'enlacePixieset', 'estadoContrato', 'estadoPendrive']) {
    const respaldo = crearRespaldo()
    respaldo.trabajos[0][campo] = { inesperado: true }
    assert.equal(esRespaldoValido(respaldo), false, campo)
  }
})

test('fechas inexistentes y formatos ambiguos no se aceptan como fechas ISO', () => {
  for (const fecha of ['2026-02-29', '2026-04-31', '11/11/2026', '', null]) {
    assert.equal(esFechaISOValida(fecha), false)
  }
  assert.equal(esFechaISOValida('2024-02-29'), true)
  const respaldo = crearRespaldo()
  respaldo.trabajos[0].cuentasCobro[0].pagos[0].fecha = '2026-02-30'
  assert.equal(esRespaldoValido(respaldo), false)
})

test('pagos con importes inválidos o estados desconocidos no se restauran', () => {
  for (const monto of [-1, 0, 1.5, Number.MAX_SAFE_INTEGER + 1, '70000']) {
    const respaldo = crearRespaldo()
    respaldo.trabajos[0].cuentasCobro[0].pagos[0].montoCentavos = monto
    assert.equal(esRespaldoValido(respaldo), false)
  }
  const respaldo = crearRespaldo()
  respaldo.trabajos[0].cuentasCobro[0].pagos[0].estado = 'Desconocido'
  assert.equal(esRespaldoValido(respaldo), false)
})

test('se rechazan IDs repetidos que mezclarían trabajos, egresos, cuentas o pagos', () => {
  const cambios = [
    (r) => r.trabajos.push(structuredClone(r.trabajos[0])),
    (r) => r.egresos.push(structuredClone(r.egresos[0])),
    (r) => r.trabajos[0].cuentasCobro.push(structuredClone(r.trabajos[0].cuentasCobro[0])),
    (r) => r.trabajos[0].cuentasCobro[0].pagos.push(structuredClone(r.trabajos[0].cuentasCobro[0].pagos[0])),
  ]
  for (const cambiar of cambios) {
    const respaldo = crearRespaldo()
    cambiar(respaldo)
    assert.equal(esRespaldoValido(respaldo), false)
  }
})
