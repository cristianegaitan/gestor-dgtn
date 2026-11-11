export type EstadoPago = 'Pendiente' | 'Confirmado'

export interface Pago {
  id: string
  montoCentavos: number
  fecha: string
  medio: string
  referencia: string
  estado: EstadoPago
}

export interface CuentaCobro {
  id: string
  nombre: string
  totalCentavos: number | null
  estadoContrato?: string
  pagos?: Pago[]
}

export interface Trabajo {
  id: number
  cliente: string
  servicio: string
  fecha: string
  estado: string
  fechaISO?: string
  estadoClase?: string
  estadoContrato?: string
  enlaceDrive?: string
  enlacePixieset?: string
  fechaEnlacesEnviados?: string
  estadoPendrive?: string
  cuentasCobro?: CuentaCobro[]
}

export interface Egreso {
  id: string
  concepto: string
  montoCentavos: number
  fecha: string
  trabajoId: number | null
}

export interface Respaldo {
  version: 1
  fechaRespaldo?: string
  trabajos: Trabajo[]
  egresos: Egreso[]
}

export type IdRegistro = number | string
export type Revisiones = Record<string, number>

export interface DatosRemotos {
  trabajos: Trabajo[]
  egresos: Egreso[]
  revisionesTrabajos: Revisiones
  revisionesEgresos: Revisiones
}

export interface FormularioPago {
  cuentaId: string
  monto: string
  fecha: string
  medio: string
  referencia: string
  estado: EstadoPago
}
