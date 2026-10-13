import { useEffect, useRef, useState } from 'react'
import { aplicarCambios } from './aplicarCambios'
import {
  cargarDatosRemotos,
  ConflictoRemotoError,
  eliminarEgresoRemoto,
  eliminarTrabajoRemoto,
  guardarEgresoRemoto,
  guardarTrabajoRemoto,
} from './datosRemotos'

export function useDatosRemotos() {
  const [trabajos, setTrabajos] = useState(null)
  const [egresos, setEgresos] = useState(null)
  const [errorCarga, setErrorCarga] = useState('')
  const [errorGuardado, setErrorGuardado] = useState('')
  const [guardando, setGuardando] = useState(false)
  const sincronizados = useRef({
    trabajos: null,
    egresos: null,
    revisionesTrabajos: {},
    revisionesEgresos: {},
  })
  const cola = useRef(Promise.resolve())
  const ultimaTarea = useRef(0)
  const guardadoBloqueado = useRef(false)

  useEffect(() => {
    let activo = true

    cargarDatosRemotos()
      .then((datos) => {
        if (!activo) return
        sincronizados.current = datos
        setTrabajos(datos.trabajos)
        setEgresos(datos.egresos)
      })
      .catch((error) => {
        if (!activo) return
        console.error('No se pudieron cargar los datos:', error)
        setErrorCarga('No se pudieron cargar los datos de Supabase. Recargá la página.')
      })

    return () => { activo = false }
  }, [])

  useEffect(() => {
    if (trabajos === null) return

    const numeroTarea = ++ultimaTarea.current
    cola.current = cola.current
      .then(async () => {
        if (guardadoBloqueado.current) return
        setGuardando(true)
        if (sincronizados.current.trabajos === null) return
        const revisionesTrabajos = await aplicarCambios(
          sincronizados.current.trabajos,
          trabajos,
          sincronizados.current.revisionesTrabajos,
          (trabajo, _orden, revision) => guardarTrabajoRemoto(trabajo, revision),
          eliminarTrabajoRemoto,
        )
        sincronizados.current = {
          ...sincronizados.current,
          trabajos,
          revisionesTrabajos,
        }
      })
      .catch((error) => {
        console.error('No se pudieron guardar los trabajos:', error)
        guardadoBloqueado.current = true
        setErrorGuardado(error instanceof ConflictoRemotoError
          ? 'Otro dispositivo cambió estos datos. Se detuvo el guardado: descargá un respaldo, recargá y compará antes de restaurarlo.'
          : 'No se pudo guardar un cambio en Supabase. Se detuvo el guardado: descargá un respaldo antes de recargar.')
      })
      .finally(() => {
        if (numeroTarea === ultimaTarea.current) setGuardando(false)
      })
  }, [trabajos])

  useEffect(() => {
    if (egresos === null) return

    const numeroTarea = ++ultimaTarea.current
    cola.current = cola.current
      .then(async () => {
        if (guardadoBloqueado.current) return
        setGuardando(true)
        if (sincronizados.current.egresos === null) return
        const revisionesEgresos = await aplicarCambios(
          sincronizados.current.egresos,
          egresos,
          sincronizados.current.revisionesEgresos,
          guardarEgresoRemoto,
          eliminarEgresoRemoto,
          true,
        )
        sincronizados.current = {
          ...sincronizados.current,
          egresos,
          revisionesEgresos,
        }
      })
      .catch((error) => {
        console.error('No se pudieron guardar los egresos:', error)
        guardadoBloqueado.current = true
        setErrorGuardado(error instanceof ConflictoRemotoError
          ? 'Otro dispositivo cambió estos datos. Se detuvo el guardado: descargá un respaldo, recargá y compará antes de restaurarlo.'
          : 'No se pudo guardar un cambio en Supabase. Se detuvo el guardado: descargá un respaldo antes de recargar.')
      })
      .finally(() => {
        if (numeroTarea === ultimaTarea.current) setGuardando(false)
      })
  }, [egresos])

  return { trabajos, setTrabajos, egresos, setEgresos, errorCarga, errorGuardado, guardando }
}
