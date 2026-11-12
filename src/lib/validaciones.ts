import type { CuentaCobro, Egreso, Pago, Respaldo, Trabajo } from '../types.ts'

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor)
}

function esEntero(valor: unknown): valor is number {
  return typeof valor === 'number' && Number.isSafeInteger(valor)
}

function esTextoOpcional(valor: unknown): boolean {
  return valor === undefined || typeof valor === 'string'
}

export function esFechaISOValida(valor: unknown): valor is string {
  if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false
  const fecha = new Date(`${valor}T00:00:00Z`)
  return !Number.isNaN(fecha.getTime()) && fecha.toISOString().slice(0, 10) === valor
}

export function esPagoValido(pago: unknown): pago is Pago {
  return esObjeto(pago) &&
    typeof pago.id === 'string' &&
    esEntero(pago.montoCentavos) && pago.montoCentavos > 0 &&
    esFechaISOValida(pago.fecha) &&
    (pago.estado === 'Pendiente' || pago.estado === 'Confirmado') &&
    typeof pago.medio === 'string' && typeof pago.referencia === 'string'
}

export function esCuentaValida(cuenta: unknown): cuenta is CuentaCobro {
  if (!esObjeto(cuenta) || typeof cuenta.id !== 'string' ||
    typeof cuenta.nombre !== 'string' ||
    !(cuenta.totalCentavos === null || (esEntero(cuenta.totalCentavos) && cuenta.totalCentavos >= 0)) ||
    !esTextoOpcional(cuenta.estadoContrato)) return false
  if (cuenta.pagos === undefined) return true
  if (!Array.isArray(cuenta.pagos) || !cuenta.pagos.every(esPagoValido)) return false
  return new Set(cuenta.pagos.map((pago) => pago.id)).size === cuenta.pagos.length
}

export function esTrabajoValido(trabajo: unknown): trabajo is Trabajo {
  if (!esObjeto(trabajo) || !esEntero(trabajo.id) || trabajo.id <= 0 ||
    typeof trabajo.cliente !== 'string' || typeof trabajo.servicio !== 'string' ||
    typeof trabajo.fecha !== 'string' || typeof trabajo.estado !== 'string') return false

  const camposTexto = ['estadoClase', 'estadoContrato', 'enlaceDrive', 'enlacePixieset', 'estadoPendrive']
  if (!camposTexto.every((campo) => esTextoOpcional(trabajo[campo]))) return false
  for (const campo of ['fechaISO', 'fechaEnlacesEnviados']) {
    const valor = trabajo[campo]
    if (valor !== undefined && valor !== '' && !esFechaISOValida(valor)) return false
  }
  if (trabajo.cuentasCobro === undefined) return true
  if (!Array.isArray(trabajo.cuentasCobro) || !trabajo.cuentasCobro.every(esCuentaValida)) return false
  return new Set(trabajo.cuentasCobro.map((cuenta) => cuenta.id)).size === trabajo.cuentasCobro.length
}

export function esEgresoValido(egreso: unknown): egreso is Egreso {
  return esObjeto(egreso) && typeof egreso.id === 'string' &&
    typeof egreso.concepto === 'string' && esFechaISOValida(egreso.fecha) &&
    esEntero(egreso.montoCentavos) && egreso.montoCentavos > 0 &&
    (egreso.trabajoId === null || (esEntero(egreso.trabajoId) && egreso.trabajoId > 0))
}

export function esRespaldoValido(datos: unknown): datos is Respaldo {
  if (!esObjeto(datos) || datos.version !== 1 || !esTextoOpcional(datos.fechaRespaldo) ||
    !Array.isArray(datos.trabajos) || !Array.isArray(datos.egresos) ||
    !datos.trabajos.every(esTrabajoValido) || !datos.egresos.every(esEgresoValido)) return false
  return new Set(datos.trabajos.map((trabajo) => trabajo.id)).size === datos.trabajos.length &&
    new Set(datos.egresos.map((egreso) => egreso.id)).size === datos.egresos.length
}
