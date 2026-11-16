import type { Dispatch, SetStateAction } from 'react'
import type { Egreso, Trabajo } from '../types'

export interface EstadoGestor {
  trabajos: Trabajo[]
  setTrabajos: Dispatch<SetStateAction<Trabajo[]>>
  egresos: Egreso[]
  setEgresos: Dispatch<SetStateAction<Egreso[]>>
  errorCarga: string
  errorGuardado: string
  guardando: boolean
  datosCargados: boolean
}
