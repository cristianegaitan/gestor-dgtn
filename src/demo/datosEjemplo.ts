import type { Respaldo } from '../types.ts'

export function crearDatosEjemplo(fechaBase = new Date()): Respaldo {
  function fecha(dias: number) {
    const valor = new Date(fechaBase)
    valor.setUTCDate(valor.getUTCDate() + dias)
    return valor.toISOString().slice(0, 10)
  }
  function etiqueta(iso: string) {
    return new Intl.DateTimeFormat('es-AR', {
      day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
    }).format(new Date(`${iso}T12:00:00Z`))
  }
  return {
    version: 1,
    trabajos: [
      {
        id: 1, cliente: 'Boda de Lucía y Mateo (ejemplo)', servicio: 'Fotografía y video',
        fechaISO: fecha(14), fecha: etiqueta(fecha(14)), estado: 'Confirmado', estadoClase: 'confirmado',
        estadoContrato: 'Firmado', estadoPendrive: 'Pendiente',
        cuentasCobro: [{
          id: 'demo-cuenta-1', nombre: 'Cobertura del evento', totalCentavos: 80000000,
          pagos: [{ id: 'demo-pago-1', montoCentavos: 30000000, fecha: fecha(-7),
            medio: 'Transferencia', referencia: 'Seña de ejemplo', estado: 'Confirmado' }],
        }],
      },
      {
        id: 2, cliente: 'Quince de Emma (ejemplo)', servicio: 'Fotografía de evento',
        fechaISO: fecha(30), fecha: etiqueta(fecha(30)), estado: 'Planificación', estadoClase: 'planificacion',
        estadoContrato: 'Pendiente', estadoPendrive: 'No corresponde',
        cuentasCobro: [{
          id: 'demo-cuenta-2', nombre: 'Fiesta de quince', totalCentavos: 50000000,
          pagos: [{ id: 'demo-pago-2', montoCentavos: 10000000, fecha: fecha(-2),
            medio: 'Transferencia', referencia: 'Pago por confirmar', estado: 'Pendiente' }],
        }],
      },
      {
        id: 3, cliente: 'Catálogo de Estudio Demo', servicio: 'Fotografía de productos',
        fechaISO: fecha(-14), fecha: etiqueta(fecha(-14)), estado: 'Confirmado', estadoClase: 'confirmado',
        estadoContrato: 'Firmado', fechaEnlacesEnviados: fecha(-2), estadoPendrive: 'No corresponde',
        cuentasCobro: [{
          id: 'demo-cuenta-3', nombre: 'Sesión de productos', totalCentavos: 12000000,
          pagos: [{ id: 'demo-pago-3', montoCentavos: 12000000, fecha: fecha(-14),
            medio: 'Transferencia', referencia: 'Pago completo de ejemplo', estado: 'Confirmado' }],
        }],
      },
    ],
    egresos: [
      { id: 'demo-egreso-1', concepto: 'Traslado de ejemplo', montoCentavos: 1200000, fecha: fecha(-1), trabajoId: 1 },
      { id: 'demo-egreso-2', concepto: 'Alquiler de equipo de ejemplo', montoCentavos: 4500000, fecha: fecha(-14), trabajoId: 3 },
      { id: 'demo-egreso-3', concepto: 'Suscripción de ejemplo', montoCentavos: 180000, fecha: fecha(-3), trabajoId: null },
    ],
  }
}
