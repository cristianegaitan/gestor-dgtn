import type { Egreso, Respaldo, Trabajo } from '../types.ts'
import { esRespaldoValido } from '../lib/validaciones.ts'
import { crearDatosEjemplo } from './datosEjemplo.ts'

export const CLAVE_DEMO = 'gestor-dgtn-demostracion-v1'
type Almacenamiento = Pick<Storage, 'getItem' | 'setItem'>
type Cambio<T> = T[] | ((anteriores: T[]) => T[])

interface EstadoDemo {
  datos: Respaldo
  aviso: string
  reinicios: number
}

export function crearAlmacenDemo(almacenamiento: Almacenamiento | null) {
  let datos = crearDatosEjemplo()
  let aviso = ''
  try {
    const contenido = almacenamiento?.getItem(CLAVE_DEMO)
    if (contenido) {
      const leido: unknown = JSON.parse(contenido)
      if (esRespaldoValido(leido)) datos = leido
      else aviso = 'La demo anterior no se pudo recuperar. Se cargaron los ejemplos.'
    }
  } catch {
    aviso = 'La demo anterior no se pudo recuperar. Se cargaron los ejemplos.'
  }
  let estado: EstadoDemo = { datos, aviso, reinicios: 0 }
  const suscriptores = new Set<() => void>()

  function guardar(nuevosDatos: Respaldo, reinicios = estado.reinicios) {
    let aviso = ''
    try {
      if (!almacenamiento) throw new Error('Almacenamiento no disponible')
      almacenamiento.setItem(CLAVE_DEMO, JSON.stringify(nuevosDatos))
    } catch {
      aviso = 'Los cambios se conservarán hasta que recargues esta página. Podés descargar un respaldo de la demo.'
    }
    estado = { datos: nuevosDatos, aviso, reinicios }
    for (const notificar of suscriptores) notificar()
  }

  return {
    getSnapshot: () => estado,
    subscribe(notificar: () => void) {
      suscriptores.add(notificar)
      return () => { suscriptores.delete(notificar) }
    },
    setTrabajos(cambio: Cambio<Trabajo>) {
      const trabajos = typeof cambio === 'function' ? cambio(estado.datos.trabajos) : cambio
      guardar({ ...estado.datos, trabajos })
    },
    setEgresos(cambio: Cambio<Egreso>) {
      const egresos = typeof cambio === 'function' ? cambio(estado.datos.egresos) : cambio
      guardar({ ...estado.datos, egresos })
    },
    reiniciar: () => { guardar(crearDatosEjemplo(), estado.reinicios + 1) },
  }
}
