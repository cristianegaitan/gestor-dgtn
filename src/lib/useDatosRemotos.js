import { useEffect, useRef, useState } from 'react'
import {
  cargarDatosRemotos,
  eliminarEgresoRemoto,
  eliminarTrabajoRemoto,
  guardarEgresoRemoto,
  guardarTrabajoRemoto,
} from './datosRemotos'

async function aplicarCambios(anteriores, actuales, guardar, eliminar, incluirOrden = false) {
  const anterioresPorId = new Map(
    anteriores.map((item, orden) => [item.id, { item, orden }]),
  )
  const idsActuales = new Set(actuales.map((item) => item.id))

  for (const [orden, item] of actuales.entries()) {
    const anterior = anterioresPorId.get(item.id)
    if (
      !anterior ||
      JSON.stringify(anterior.item) !== JSON.stringify(item) ||
      (incluirOrden && anterior.orden !== orden)
    ) {
      await guardar(item, orden)
    }
  }

  for (const item of anteriores) {
    if (!idsActuales.has(item.id)) await eliminar(item.id)
  }
}

export function useDatosRemotos() {
  const [trabajos, setTrabajos] = useState(null)
  const [egresos, setEgresos] = useState(null)
  const [errorCarga, setErrorCarga] = useState('')
  const [errorGuardado, setErrorGuardado] = useState('')
  const [guardando, setGuardando] = useState(false)
  const sincronizados = useRef({ trabajos: null, egresos: null })
  const cola = useRef(Promise.resolve())
  const ultimaTarea = useRef(0)

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
        setGuardando(true)
        if (sincronizados.current.trabajos === null) return
        await aplicarCambios(
          sincronizados.current.trabajos,
          trabajos,
          guardarTrabajoRemoto,
          eliminarTrabajoRemoto,
        )
        sincronizados.current.trabajos = trabajos
      })
      .catch((error) => {
        console.error('No se pudieron guardar los trabajos:', error)
        setErrorGuardado('No se pudo guardar un cambio en Supabase. Descargá un respaldo antes de cerrar la página.')
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
        setGuardando(true)
        if (sincronizados.current.egresos === null) return
        await aplicarCambios(
          sincronizados.current.egresos,
          egresos,
          guardarEgresoRemoto,
          eliminarEgresoRemoto,
          true,
        )
        sincronizados.current.egresos = egresos
      })
      .catch((error) => {
        console.error('No se pudieron guardar los egresos:', error)
        setErrorGuardado('No se pudo guardar un cambio en Supabase. Descargá un respaldo antes de cerrar la página.')
      })
      .finally(() => {
        if (numeroTarea === ultimaTarea.current) setGuardando(false)
      })
  }, [egresos])

  return { trabajos, setTrabajos, egresos, setEgresos, errorCarga, errorGuardado, guardando }
}
