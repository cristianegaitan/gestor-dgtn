import { useEffect, useState } from 'react'
import './App.css'

const CLAVE_TRABAJOS = 'gestor-dgtn-trabajos'

const CLAVE_EGRESOS = 'gestor-dgtn-egresos'

function obtenerEgresosGuardados() {
  try {
    const texto = localStorage.getItem(CLAVE_EGRESOS)
    if (texto === null) return []

    const datos = JSON.parse(texto)

    return esRespaldoValido({
      version: 1,
      trabajos: [],
      egresos: datos,
    })
      ? datos
      : null
  } catch {
    return null
  }
}

const trabajosIniciales = [
  {
    id: 1,
    cliente: 'Sofía Martínez',
    servicio: 'Fiesta de 15 años',
    fecha: '28 de septiembre',
    estado: 'Confirmado',
    estadoClase: 'confirmado',
  },
  {
    id: 2,
    cliente: 'Colegio San Martín',
    servicio: 'Egresados 2026',
    fecha: '3 de octubre',
    estado: 'Confirmado',
    estadoClase: 'confirmado',
  },
  {
    id: 3,
    cliente: 'AST Agro',
    servicio: 'Video institucional',
    fecha: '8 de octubre',
    estado: 'Planificación',
    estadoClase: 'planificacion',
  },
]

const formularioInicial = {
  cliente: '',
  servicio: '',
  fecha: '',
  estado: 'Planificación',
  estadoContrato: 'Pendiente',
  enlaceDrive: '',
  enlacePixieset: '',
  fechaEnlacesEnviados: '',
  estadoPendrive: 'No corresponde',
}

const formularioEgresoInicial = {
  concepto: '',
  monto: '',
  fecha: '',
  trabajoId: '',
}

function obtenerTrabajosGuardados() {
  try {
    const texto = localStorage.getItem(CLAVE_TRABAJOS)
    if (texto === null) return trabajosIniciales

    const datos = JSON.parse(texto)

    return esRespaldoValido({
      version: 1,
      trabajos: datos,
      egresos: [],
    })
      ? datos
      : null
  } catch {
    return null
  }
}

function formatearFecha(fecha) {
  const fechaLocal = new Date(`${fecha}T00:00:00`)

  return new Intl.DateTimeFormat('es-AR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(fechaLocal)
}

function calcularCobradoCentavos(cuenta) {
  return (cuenta.pagos ?? [])
    .filter((pago) => pago.estado === 'Confirmado')
    .reduce((total, pago) => total + pago.montoCentavos, 0)
}

function calcularFechaGuiaEntrega(fechaISO) {
  if (!fechaISO) return null

  const fecha = new Date(`${fechaISO}T12:00:00`)

  if (Number.isNaN(fecha.getTime())) return null

  fecha.setDate(fecha.getDate() + 42)

  return new Intl.DateTimeFormat('es-AR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(fecha)
}

function esFechaISOValida(valor) {
  if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    return false
  }

  const fecha = new Date(`${valor}T00:00:00Z`)

  return !Number.isNaN(fecha.getTime()) &&
    fecha.toISOString().slice(0, 10) === valor
}

function esPagoValido(pago) {
  return pago &&
    typeof pago.id === 'string' &&
    Number.isSafeInteger(pago.montoCentavos) &&
    pago.montoCentavos > 0 &&
    esFechaISOValida(pago.fecha) &&
    ['Pendiente', 'Confirmado'].includes(pago.estado) &&
    typeof pago.medio === 'string' &&
    typeof pago.referencia === 'string'
}

function esCuentaValida(cuenta) {
  if (
    !cuenta ||
    typeof cuenta.id !== 'string' ||
    typeof cuenta.nombre !== 'string' ||
    !(cuenta.totalCentavos === null ||
      (Number.isSafeInteger(cuenta.totalCentavos) &&
        cuenta.totalCentavos >= 0))
  ) {
    return false
  }

  if (cuenta.pagos === undefined) return true

  if (!Array.isArray(cuenta.pagos) || !cuenta.pagos.every(esPagoValido)) {
    return false
  }

  return new Set(cuenta.pagos.map((pago) => pago.id)).size === cuenta.pagos.length
}

function esTrabajoValido(trabajo) {
  if (
    !trabajo ||
    !Number.isSafeInteger(trabajo.id) ||
    trabajo.id <= 0 ||
    typeof trabajo.cliente !== 'string' ||
    typeof trabajo.servicio !== 'string' ||
    typeof trabajo.fecha !== 'string' ||
    typeof trabajo.estado !== 'string' ||
    (trabajo.fechaISO !== undefined &&
      trabajo.fechaISO !== '' &&
      !esFechaISOValida(trabajo.fechaISO)) ||
    (trabajo.fechaEnlacesEnviados !== undefined &&
      trabajo.fechaEnlacesEnviados !== '' &&
      !esFechaISOValida(trabajo.fechaEnlacesEnviados))
  ) {
    return false
  }

  if (trabajo.cuentasCobro === undefined) return true

  if (
    !Array.isArray(trabajo.cuentasCobro) ||
    !trabajo.cuentasCobro.every(esCuentaValida)
  ) {
    return false
  }

  return new Set(trabajo.cuentasCobro.map((cuenta) => cuenta.id)).size ===
    trabajo.cuentasCobro.length
}

function esEgresoValido(egreso) {
  return egreso &&
    typeof egreso.id === 'string' &&
    typeof egreso.concepto === 'string' &&
    esFechaISOValida(egreso.fecha) &&
    Number.isSafeInteger(egreso.montoCentavos) &&
    egreso.montoCentavos > 0 &&
    (egreso.trabajoId === null ||
      (Number.isSafeInteger(egreso.trabajoId) && egreso.trabajoId > 0))
}

function esRespaldoValido(datos) {
  if (
    datos?.version !== 1 ||
    !Array.isArray(datos.trabajos) ||
    !Array.isArray(datos.egresos) ||
    !datos.trabajos.every(esTrabajoValido) ||
    !datos.egresos.every(esEgresoValido)
  ) {
    return false
  }

  return new Set(datos.trabajos.map((trabajo) => trabajo.id)).size ===
    datos.trabajos.length &&
    new Set(datos.egresos.map((egreso) => egreso.id)).size ===
    datos.egresos.length
}

function generarIdTrabajo() {
  return Date.now()
}


function App() {
  const [trabajos, setTrabajos] = useState(obtenerTrabajosGuardados)
  const [egresos, setEgresos] = useState(obtenerEgresosGuardados)
  const [formularioEgreso, setFormularioEgreso] = useState(formularioEgresoInicial)
  const [idEgresoEnEdicion, setIdEgresoEnEdicion] = useState(null)
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [formulario, setFormulario] = useState(formularioInicial)
  const [formularioCuenta, setFormularioCuenta] = useState({
    nombre: '',
    total: '',
  })

  const [idCuentaEnEdicion, setIdCuentaEnEdicion] = useState(null)

  const [formularioPago, setFormularioPago] = useState({
    cuentaId: '',
    monto: '',
    fecha: '',
    medio: 'Transferencia',
    referencia: '',
    estado: 'Pendiente',
  })
  const [idTrabajoSeleccionado, setTrabajoSeleccionado] = useState(null)
  const [idTrabajoEnEdicion, setIdTrabajoEnEdicion] = useState(null)

  const datosCargados = trabajos !== null && egresos !== null

  useEffect(() => {
    if (!datosCargados) return

    try {
      localStorage.setItem(CLAVE_TRABAJOS, JSON.stringify(trabajos))
    } catch {
      window.alert(
        'No se pudieron guardar los trabajos en este navegador. ' +
        'Descargá un respaldo antes de cerrar o recargar la aplicación.',
      )
    }
  }, [trabajos, datosCargados])

  useEffect(() => {
    if (!datosCargados) return

    try {
      localStorage.setItem(CLAVE_EGRESOS, JSON.stringify(egresos))
    } catch {
      window.alert(
        'No se pudieron guardar los egresos en este navegador. ' +
        'Descargá un respaldo antes de cerrar o recargar la aplicación.',
      )
    }
  }, [egresos, datosCargados])

  if (!datosCargados) {
    return (
      <div className="app-shell">
        <main className="form-panel">
          <h1>No se pudieron cargar los datos guardados</h1>
          <p role="alert">
            Se pausó el guardado para conservar los datos originales.
          </p>
          <p>
            Podés recargar la página o restaurar un respaldo válido.
          </p>

          <div className="form-field">
            <label htmlFor="respaldo-recuperacion">
              Restaurar respaldo
            </label>
            <input
              id="respaldo-recuperacion"
              type="file"
              accept=".json,application/json"
              onChange={restaurarRespaldo}
            />
          </div>
        </main>
      </div>
    )
  }

  const trabajoSeleccionado =
    trabajos.find((trabajo) => trabajo.id === idTrabajoSeleccionado) ?? null

  const saldoPendienteCentavos = trabajos
    .flatMap((trabajo) => trabajo.cuentasCobro ?? [])
    .reduce((suma, cuenta) => {
      if (cuenta.totalCentavos === null) return suma

      const saldo = cuenta.totalCentavos - calcularCobradoCentavos(cuenta)
      return suma + Math.max(0, saldo)
    }, 0)

  const resumen = [
    {
      id: 1,
      etiqueta: 'Trabajos registrados',
      valor: trabajos.length,
      detalle: 'Guardados en este navegador',
    },
    {
      id: 2,
      etiqueta: 'En planificación',
      valor: trabajos.filter(
        (trabajo) => trabajo.estado === 'Planificación'
      ).length,
      detalle: 'Trabajos en preparación',
    },
    {
      id: 3,
      etiqueta: 'Confirmados',
      valor: trabajos.filter(
        (trabajo) => trabajo.estado === 'Confirmado'
      ).length,
      detalle: 'Trabajos acordados',
    },

    {
      id: 4,
      etiqueta: 'Saldo por cobrar',
      valor: (saldoPendienteCentavos / 100).toLocaleString('es-AR', {
        style: 'currency',
        currency: 'ARS',
      }),
      detalle: 'Cuentas con total registrado',
    },
  ]



  function manejarCambio(evento) {
    const { name, value } = evento.target

    setFormulario((formularioActual) => ({
      ...formularioActual,
      [name]: value,
    }))
  }

  function descargarRespaldo() {
    const datos = {
      version: 1,
      fechaRespaldo: new Date().toISOString(),
      trabajos,
      egresos,
    }

    const archivo = new Blob(
      [JSON.stringify(datos, null, 2)],
      { type: 'application/json' },
    )
    const url = URL.createObjectURL(archivo)
    const enlace = document.createElement('a')

    enlace.href = url
    enlace.download = `gestor-dgtn-respaldo-${new Date().toISOString().slice(0, 10)}.json`
    document.body.append(enlace)
    enlace.click()
    enlace.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  async function restaurarRespaldo(evento) {
    const archivo = evento.target.files?.[0]
    evento.target.value = ''

    if (!archivo) return

    try {
      const datos = JSON.parse(await archivo.text())

      const esValido = esRespaldoValido(datos)

      if (!esValido) {
        window.alert('El archivo no es un respaldo válido de Gestor DGTN.')
        return
      }

      if (!window.confirm('¿Reemplazar los trabajos y egresos actuales con este respaldo?')) {
        return
      }

      setTrabajos(datos.trabajos)
      setEgresos(datos.egresos)
      setTrabajoSeleccionado(null)
      cerrarFormulario()
    } catch {
      window.alert('No se pudo leer el archivo de respaldo.')
    }
  }

  function manejarCambioEgreso(evento) {
    const { name, value } = evento.target

    setFormularioEgreso((datosActuales) => ({
      ...datosActuales,
      [name]: value,
    }))
  }

  function manejarCambioCuenta(evento) {
    const { name, value } = evento.target

    setFormularioCuenta((datosActuales) => ({
      ...datosActuales,
      [name]: value,
    }))
  }

  function manejarCambioPago(evento) {
    const { name, value } = evento.target

    setFormularioPago((datosActuales) => ({
      ...datosActuales,
      [name]: value,
    }))
  }

  function cerrarFormulario() {
    setFormulario(formularioInicial)
    setIdTrabajoEnEdicion(null)
    setMostrarFormulario(false)
  }

  function iniciarEdicion(trabajo) {
    setIdTrabajoEnEdicion(trabajo.id)
    setFormulario({
      cliente: trabajo.cliente,
      servicio: trabajo.servicio,
      fecha: trabajo.fechaISO ?? '',
      estado: trabajo.estado,
      estadoContrato: trabajo.estadoContrato ?? 'Pendiente',
      enlaceDrive: trabajo.enlaceDrive ?? '',
      enlacePixieset: trabajo.enlacePixieset ?? '',
      fechaEnlacesEnviados: trabajo.fechaEnlacesEnviados ?? '',
      estadoPendrive: trabajo.estadoPendrive ?? 'No corresponde',
    })
    setTrabajoSeleccionado(null)
    setMostrarFormulario(true)
  }

  function iniciarEdicionCuenta(cuenta) {
    setIdCuentaEnEdicion(cuenta.id)
    setFormularioCuenta({
      nombre: cuenta.nombre,
      total:
        cuenta.totalCentavos === null
          ? ''
          : String(cuenta.totalCentavos / 100),
    })
  }

  function agregarCuenta(evento) {
    evento.preventDefault()

    if (idTrabajoSeleccionado === null) return

    const nombre = formularioCuenta.nombre.trim()
    const totalTexto = formularioCuenta.total.trim()
    const totalCentavos =
      totalTexto === '' ? null : Math.round(Number(totalTexto) * 100)

    if (!nombre) return
    if (
      totalCentavos !== null &&
      (!Number.isSafeInteger(totalCentavos) || totalCentavos < 0)
    ) return

    if (idCuentaEnEdicion !== null) {
      setTrabajos((trabajosActuales) =>
        trabajosActuales.map((trabajo) =>
          trabajo.id === idTrabajoSeleccionado
            ? {
              ...trabajo,
              cuentasCobro: (trabajo.cuentasCobro ?? []).map((cuenta) =>
                cuenta.id === idCuentaEnEdicion
                  ? { ...cuenta, nombre, totalCentavos }
                  : cuenta,
              ),
            }
            : trabajo,
        ),
      )

      setIdCuentaEnEdicion(null)
      setFormularioCuenta({ nombre: '', total: '' })
      return
    }

    const cuentaNueva = {
      id: crypto.randomUUID(),
      nombre,
      totalCentavos,
      estadoContrato: 'Pendiente',
      pagos: [],
    }

    setTrabajos((trabajosActuales) =>
      trabajosActuales.map((trabajo) =>
        trabajo.id === idTrabajoSeleccionado
          ? {
            ...trabajo,
            cuentasCobro: [...(trabajo.cuentasCobro ?? []), cuentaNueva],
          }
          : trabajo,
      ),
    )

    setFormularioCuenta({ nombre: '', total: '' })
  }
  function eliminarEgreso(egreso) {
    if (!window.confirm(`¿Eliminar el egreso "${egreso.concepto}"?`)) {
      return
    }

    setEgresos((egresosActuales) =>
      egresosActuales.filter((item) => item.id !== egreso.id),
    )

    if (idEgresoEnEdicion === egreso.id) {
      setIdEgresoEnEdicion(null)
      setFormularioEgreso(formularioEgresoInicial)
    }
  }

  function iniciarEdicionEgreso(egreso) {
    setIdEgresoEnEdicion(egreso.id)
    setFormularioEgreso({
      concepto: egreso.concepto,
      monto: String(egreso.montoCentavos / 100),
      fecha: egreso.fecha,
      trabajoId: egreso.trabajoId === null ? '' : String(egreso.trabajoId),
    })
  }

  function registrarEgreso(evento) {
    evento.preventDefault()

    const concepto = formularioEgreso.concepto.trim()
    const montoCentavos = Math.round(Number(formularioEgreso.monto) * 100)
    const trabajoId =
      formularioEgreso.trabajoId === ''
        ? null
        : Number(formularioEgreso.trabajoId)

    if (
      !concepto ||
      !formularioEgreso.fecha ||
      !Number.isSafeInteger(montoCentavos) ||
      montoCentavos <= 0 ||
      (trabajoId !== null &&
        !trabajos.some((trabajo) => trabajo.id === trabajoId))
    ) {
      return
    }

    if (idEgresoEnEdicion !== null) {
      setEgresos((egresosActuales) =>
        egresosActuales.map((egreso) =>
          egreso.id === idEgresoEnEdicion
            ? {
              ...egreso,
              concepto,
              montoCentavos,
              fecha: formularioEgreso.fecha,
              trabajoId,
            }
            : egreso,
        ),
      )

      setIdEgresoEnEdicion(null)
      setFormularioEgreso(formularioEgresoInicial)
      return
    }

    const nuevoEgreso = {
      id: crypto.randomUUID(),
      concepto,
      montoCentavos,
      fecha: formularioEgreso.fecha,
      trabajoId,
    }

    setEgresos((egresosActuales) => [...egresosActuales, nuevoEgreso])
    setFormularioEgreso(formularioEgresoInicial)
  }

  function registrarPago(evento) {
    evento.preventDefault()

    const montoCentavos = Math.round(Number(formularioPago.monto) * 100)
    const cuentaExiste = trabajoSeleccionado?.cuentasCobro?.some(
      (cuenta) => cuenta.id === formularioPago.cuentaId,
    )

    if (
      !cuentaExiste ||
      !formularioPago.fecha ||
      !Number.isSafeInteger(montoCentavos) ||
      montoCentavos <= 0
    ) {
      return
    }

    const pagoNuevo = {
      id: crypto.randomUUID(),
      montoCentavos,
      fecha: formularioPago.fecha,
      medio: formularioPago.medio,
      referencia: formularioPago.referencia.trim(),
      estado: formularioPago.estado,
    }

    setTrabajos((trabajosActuales) =>
      trabajosActuales.map((trabajo) =>
        trabajo.id === idTrabajoSeleccionado
          ? {
            ...trabajo,
            cuentasCobro: (trabajo.cuentasCobro ?? []).map((cuenta) =>
              cuenta.id === formularioPago.cuentaId
                ? {
                  ...cuenta,
                  pagos: [...(cuenta.pagos ?? []), pagoNuevo],
                }
                : cuenta,
            ),
          }
          : trabajo,
      ),
    )

    setFormularioPago({
      cuentaId: '',
      monto: '',
      fecha: '',
      medio: 'Transferencia',
      referencia: '',
      estado: 'Pendiente',
    })
  }

  function cambiarEstadoPago(cuentaId, pagoId) {
    setTrabajos((trabajosActuales) =>
      trabajosActuales.map((trabajo) =>
        trabajo.id === idTrabajoSeleccionado
          ? {
            ...trabajo,
            cuentasCobro: (trabajo.cuentasCobro ?? []).map((cuenta) =>
              cuenta.id === cuentaId
                ? {
                  ...cuenta,
                  pagos: (cuenta.pagos ?? []).map((pago) =>
                    pago.id === pagoId
                      ? {
                        ...pago,
                        estado: pago.estado === 'Confirmado'
                          ? 'Pendiente'
                          : 'Confirmado',
                      }
                      : pago,
                  ),
                }
                : cuenta,
            ),
          }
          : trabajo,
      ),
    )
  }

  function manejarEnvio(evento) {
    evento.preventDefault()

    const nuevoTrabajo = {
      id: generarIdTrabajo(),
      cliente: formulario.cliente.trim(),
      servicio: formulario.servicio.trim(),
      fechaISO: formulario.fecha,
      fecha: formatearFecha(formulario.fecha),
      estado: formulario.estado,
      estadoContrato: formulario.estadoContrato,
      enlaceDrive: formulario.enlaceDrive.trim(),
      enlacePixieset: formulario.enlacePixieset.trim(),
      fechaEnlacesEnviados: formulario.fechaEnlacesEnviados,
      estadoPendrive: formulario.estadoPendrive,
      estadoClase:
        formulario.estado === 'Confirmado'
          ? 'confirmado'
          : 'planificacion',
    }

    if (idTrabajoEnEdicion !== null) {
      setTrabajos((trabajosActuales) =>
        trabajosActuales.map((trabajo) =>
          trabajo.id === idTrabajoEnEdicion
            ? { ...trabajo, ...nuevoTrabajo, id: trabajo.id }
            : trabajo,
        ),
      )

      cerrarFormulario()
      return
    }

    setTrabajos((trabajosActuales) => [
      ...trabajosActuales,
      { ...nuevoTrabajo, cuentasCobro: [] },
    ])

    cerrarFormulario()
  }

  function manejarBotonFormulario() {
    if (mostrarFormulario) {
      cerrarFormulario()
      return
    }

    setFormulario(formularioInicial)
    setIdTrabajoEnEdicion(null)
    setTrabajoSeleccionado(null)
    setMostrarFormulario(true)
  }

  function abrirDetalle(trabajo) {
    cerrarFormulario()
    setIdCuentaEnEdicion(null)
    setFormularioCuenta({ nombre: '', total: '' })
    setTrabajoSeleccionado(trabajo.id)
  }

  function cerrarDetalle() {
    setTrabajoSeleccionado(null)
  }

  function eliminarTrabajoSeleccionado() {
    if (!trabajoSeleccionado) return

    const confirmado = window.confirm(
      `¿Eliminar el trabajo de ${trabajoSeleccionado.cliente}?`
    )

    if (!confirmado) return

    setTrabajos((trabajosActuales) =>
      trabajosActuales.filter(
        (trabajo) => trabajo.id !== trabajoSeleccionado.id
      )
    )
    setTrabajoSeleccionado(null)
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="brand">DGTN · Gestión audiovisual</p>
          <h1>Panel de trabajo</h1>
          <p className="subtitle">
            Administrá clientes, eventos y entregas desde un solo lugar.
          </p>
        </div>

        <button
          className="primary-button"
          type="button"
          aria-expanded={mostrarFormulario}
          aria-controls="nuevo-trabajo"
          onClick={manejarBotonFormulario}
        >
          {mostrarFormulario ? 'Cerrar formulario' : '+ Nuevo trabajo'}
        </button>
      </header>

      {mostrarFormulario && (
        <section
          className="form-panel"
          id="nuevo-trabajo"
          aria-labelledby="form-title"
        >
          <div className="form-heading">
            <p className="section-label">
              {idTrabajoEnEdicion !== null ? 'Edición de trabajo' : 'Nuevo registro'}
            </p>
            <h2 id="form-title">
              {idTrabajoEnEdicion !== null ? 'Editar trabajo' : 'Agregar trabajo'}
            </h2>
            <p>
              Ingresá los datos principales. Podrás agregar contrato,
              pagos y enlaces de entrega más adelante.
            </p>
          </div>

          <form className="job-form" onSubmit={manejarEnvio}>
            <div className="form-field">
              <label htmlFor="cliente">Cliente</label>
              <input
                id="cliente"
                name="cliente"
                type="text"
                value={formulario.cliente}
                onChange={manejarCambio}
                placeholder="Ejemplo: Martina López"
                required
              />
            </div>

            <div className="form-field">
              <label htmlFor="servicio">Servicio</label>
              <input
                id="servicio"
                name="servicio"
                type="text"
                value={formulario.servicio}
                onChange={manejarCambio}
                placeholder="Ejemplo: Fiesta de 15 años"
                required
              />
            </div>

            <div className="form-field">
              <label htmlFor="fecha">Fecha del evento</label>
              <input
                id="fecha"
                name="fecha"
                type="date"
                min="2000-01-01"
                max="2100-12-31"
                value={formulario.fecha}
                onChange={manejarCambio}
                required
              />
            </div>

            <div className="form-field">
              <label htmlFor="estado">Estado</label>
              <select
                id="estado"
                name="estado"
                value={formulario.estado}
                onChange={manejarCambio}
              >
                <option value="Planificación">Planificación</option>
                <option value="Confirmado">Confirmado</option>
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="estadoContrato">Contrato</label>
              <select
                id="estadoContrato"
                name="estadoContrato"
                value={formulario.estadoContrato}
                onChange={manejarCambio}
              >
                <option value="Pendiente">Pendiente de firma</option>
                <option value="Firmado">Firmado</option>
              </select>
            </div>

            <div className="form-field">
              <label htmlFor="enlaceDrive">Enlace de Google Drive</label>
              <input
                id="enlaceDrive"
                name="enlaceDrive"
                type="url"
                value={formulario.enlaceDrive}
                onChange={manejarCambio}
                placeholder="https://drive.google.com/..."
              />
            </div>

            <div className="form-field">
              <label htmlFor="enlacePixieset">Enlace de Pixieset</label>
              <input
                id="enlacePixieset"
                name="enlacePixieset"
                type="url"
                value={formulario.enlacePixieset}
                onChange={manejarCambio}
                placeholder="https://dgtn75.pixieset.com/..."
              />
            </div>

            <div className="form-field">
              <label htmlFor="fechaEnlacesEnviados">Fecha de envío de enlaces (opcional)</label>
              <input
                id="fechaEnlacesEnviados"
                name="fechaEnlacesEnviados"
                type="date"
                value={formulario.fechaEnlacesEnviados}
                onChange={manejarCambio}
              />
            </div>

            <div className="form-field">
              <label htmlFor="estadoPendrive">Pendrive</label>
              <select
                id="estadoPendrive"
                name="estadoPendrive"
                value={formulario.estadoPendrive}
                onChange={manejarCambio}
              >
                <option value="No corresponde">No corresponde</option>
                <option value="Pendiente">Pendiente de entregar</option>
                <option value="Entregado">Entregado</option>
              </select>
            </div>

            <div className="form-actions">
              <button
                className="cancel-button"
                type="button"
                onClick={cerrarFormulario}
              >
                Cancelar
              </button>

              <button className="primary-button" type="submit">
                {idTrabajoEnEdicion !== null ? 'Guardar cambios' : 'Guardar trabajo'}
              </button>
            </div>
          </form>
        </section>
      )}

      <main className="dashboard">
        {trabajoSeleccionado && (
          <section className="detail-panel" aria-labelledby="detail-title">
            <div className="detail-heading">
              <div>
                <p className="section-label">Detalle del trabajo</p>
                <h2 id="detail-title">{trabajoSeleccionado.cliente}</h2>
                <p>{trabajoSeleccionado.servicio}</p>
                <p>
                  Egresos de este trabajo:{' '}
                  {(egresos
                    .filter((egreso) => egreso.trabajoId === trabajoSeleccionado.id)
                    .reduce((suma, egreso) => suma + egreso.montoCentavos, 0) / 100)
                    .toLocaleString('es-AR', {
                      style: 'currency',
                      currency: 'ARS',
                    })}
                </p>
              </div>

              <button
                className="secondary-button"
                type="button"
                onClick={() => iniciarEdicion(trabajoSeleccionado)}
              >
                Editar trabajo
              </button>

              <button
                className="cancel-button"
                type="button"
                onClick={eliminarTrabajoSeleccionado}
              >
                Eliminar trabajo
              </button>

              <button
                className="secondary-button"
                type="button"
                onClick={cerrarDetalle}
              >
                Cerrar detalle
              </button>
            </div>

            <div className="detail-grid">
              <article className="detail-card">
                <h3>Evento</h3>
                <p>
                  <strong>Fecha:</strong> {trabajoSeleccionado.fecha}
                </p>
                {trabajoSeleccionado.fechaISO && (
                  <p>
                    <strong>Fecha guía de entrega (6 semanas):</strong>{' '}
                    {calcularFechaGuiaEntrega(trabajoSeleccionado.fechaISO)}
                  </p>
                )}

                <p>
                  <strong>Estado:</strong> {trabajoSeleccionado.estado}
                </p>
              </article>

              <article className="detail-card">
                <h3>Contrato</h3>
                <p>
                  {trabajoSeleccionado.estadoContrato === 'Firmado'
                    ? 'Firmado'
                    : 'Pendiente de firma'}
                </p>
              </article>

              <article className="detail-card payments-card">
                <h3>Pagos</h3>
                <p>
                  Cuentas de cobro: {(trabajoSeleccionado.cuentasCobro ?? []).length}
                </p>

                {(trabajoSeleccionado.cuentasCobro ?? []).length > 0 && (
                  <ul className="account-list">
                    {(trabajoSeleccionado.cuentasCobro ?? []).map((cuenta) => (
                      <li key={cuenta.id}>
                        <strong>{cuenta.nombre}</strong>
                        <button
                          className="secondary-button"
                          type="button"
                          onClick={() => iniciarEdicionCuenta(cuenta)}
                        >
                          Editar cuenta
                        </button>

                        <span>
                          {cuenta.totalCentavos === null
                            ? 'Total sin registrar'
                            : (cuenta.totalCentavos / 100).toLocaleString('es-AR', {
                              style: 'currency',
                              currency: 'ARS',
                            })}
                        </span>

                        {typeof cuenta.totalCentavos === 'number' && (
                          <>
                            <span>
                              Anticipo habitual (70 %): {(Math.round(cuenta.totalCentavos * 0.7) / 100).toLocaleString('es-AR', {
                                style: 'currency',
                                currency: 'ARS',
                              })}
                            </span>
                            <span>
                              Al entregar (30 %): {((cuenta.totalCentavos - Math.round(cuenta.totalCentavos * 0.7)) / 100).toLocaleString('es-AR', {
                                style: 'currency',
                                currency: 'ARS',
                              })}
                            </span>
                          </>
                        )}

                        <span>
                          Cobrado: {(calcularCobradoCentavos(cuenta) / 100).toLocaleString('es-AR', {
                            style: 'currency',
                            currency: 'ARS',
                          })}
                        </span>

                        {typeof cuenta.totalCentavos === 'number' && (
                          <span>
                            Saldo: {((cuenta.totalCentavos - calcularCobradoCentavos(cuenta)) / 100).toLocaleString('es-AR', {
                              style: 'currency',
                              currency: 'ARS',
                            })}
                          </span>
                        )}

                        {(cuenta.pagos ?? []).map((pago) => (
                          <p key={pago.id}>
                            {pago.estado}: {(pago.montoCentavos / 100).toLocaleString('es-AR', {
                              style: 'currency',
                              currency: 'ARS',
                            })} · {pago.medio} · {pago.fecha}

                            <button
                              className="secondary-button payment-status-button"
                              type="button"
                              onClick={() => cambiarEstadoPago(cuenta.id, pago.id)}
                            >
                              {pago.estado === 'Confirmado' ? 'Volver a pendiente' : 'Confirmar pago'}
                            </button>

                          </p>
                        ))}

                      </li>
                    ))}
                  </ul>
                )}

                <form className="account-form" onSubmit={agregarCuenta}>
                  <div className="form-field">
                    <label htmlFor="nombreCuenta">Cliente o alumno</label>
                    <input
                      id="nombreCuenta"
                      name="nombre"
                      type="text"
                      value={formularioCuenta.nombre}
                      onChange={manejarCambioCuenta}
                      required
                    />
                  </div>

                  <div className="form-field">
                    <label htmlFor="totalCuenta">Total acordado en pesos (opcional)</label>
                    <input
                      id="totalCuenta"
                      name="total"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formularioCuenta.total}
                      onChange={manejarCambioCuenta}
                    />
                  </div>

                  <button className="secondary-button" type="submit">
                    {idCuentaEnEdicion === null ? 'Agregar cuenta' : 'Guardar cuenta'}
                  </button>

                  {idCuentaEnEdicion !== null && (
                    <button
                      className="cancel-button"
                      type="button"
                      onClick={() => {
                        setIdCuentaEnEdicion(null)
                        setFormularioCuenta({ nombre: '', total: '' })
                      }}
                    >
                      Cancelar edición
                    </button>
                  )}

                </form>
                {(trabajoSeleccionado.cuentasCobro ?? []).length > 0 && (
                  <form className="payment-form" onSubmit={registrarPago}>
                    <div className="form-field">
                      <label htmlFor="cuentaPago">Cuenta del pago</label>
                      <select
                        id="cuentaPago"
                        name="cuentaId"
                        value={formularioPago.cuentaId}
                        onChange={manejarCambioPago}
                        required
                      >
                        <option value="">Seleccioná una cuenta</option>
                        {(trabajoSeleccionado.cuentasCobro ?? []).map((cuenta) => (
                          <option key={cuenta.id} value={cuenta.id}>
                            {cuenta.nombre}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-field">
                      <label htmlFor="montoPago">Monto en pesos</label>
                      <input
                        id="montoPago"
                        name="monto"
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={formularioPago.monto}
                        onChange={manejarCambioPago}
                        required
                      />
                    </div>

                    <div className="form-field">
                      <label htmlFor="fechaPago">Fecha del movimiento</label>
                      <input
                        id="fechaPago"
                        name="fecha"
                        type="date"
                        value={formularioPago.fecha}
                        onChange={manejarCambioPago}
                        required
                      />
                    </div>

                    <div className="form-field">
                      <label htmlFor="medioPago">Medio de pago</label>
                      <select
                        id="medioPago"
                        name="medio"
                        value={formularioPago.medio}
                        onChange={manejarCambioPago}
                      >
                        <option value="Transferencia">Transferencia</option>
                        <option value="Efectivo">Efectivo</option>
                        <option value="Otro">Otro</option>
                      </select>
                    </div>

                    <div className="form-field">
                      <label htmlFor="estadoPago">Estado del cobro</label>
                      <select
                        id="estadoPago"
                        name="estado"
                        value={formularioPago.estado}
                        onChange={manejarCambioPago}
                      >
                        <option value="Pendiente">Pendiente de confirmar</option>
                        <option value="Confirmado">Confirmado</option>
                      </select>
                    </div>

                    <div className="form-field">
                      <label htmlFor="referenciaPago">Referencia o nota (opcional)</label>
                      <input
                        id="referenciaPago"
                        name="referencia"
                        type="text"
                        value={formularioPago.referencia}
                        onChange={manejarCambioPago}
                        placeholder="Ejemplo: transferencia 1234"
                      />
                    </div>

                    <button className="secondary-button" type="submit">
                      Registrar pago
                    </button>
                  </form>
                )}

              </article>

              <article className="detail-card delivery-card">
                <h3>Entrega</h3>
                <p>
                  <strong>Enlaces enviados:</strong>{' '}
                  {trabajoSeleccionado.fechaEnlacesEnviados
                    ? formatearFecha(trabajoSeleccionado.fechaEnlacesEnviados)
                    : 'Sin registrar'}
                </p>

                <p>
                  <strong>Pendrive:</strong>{' '}
                  {trabajoSeleccionado.estadoPendrive ?? 'No corresponde'}
                </p>

                {trabajoSeleccionado.enlaceDrive ? (
                  <p>
                    <a
                      href={trabajoSeleccionado.enlaceDrive}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Abrir Drive
                    </a>
                  </p>
                ) : (
                  <p>Drive sin registrar</p>
                )}

                {trabajoSeleccionado.enlacePixieset ? (
                  <p>
                    <a
                      href={trabajoSeleccionado.enlacePixieset}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Abrir Pixieset
                    </a>
                  </p>
                ) : (
                  <p>Pixieset sin registrar</p>
                )}
              </article>
            </div>
          </section>
        )}
        <section className="summary-grid" aria-label="Resumen de trabajos">
          {resumen.map((item) => (
            <article className="summary-card" key={item.id}>
              <p>{item.etiqueta}</p>
              <strong>{item.valor}</strong>
              <span>{item.detalle}</span>
            </article>
          ))}
        </section>

        <section className="jobs-section expenses-section" aria-labelledby="egresos-title">
          <div className="section-heading">
            <div>
              <p className="section-label">Finanzas</p>
              <h2 id="egresos-title">Egresos</h2>
            </div>
            <button
              className="secondary-button"
              type="button"
              onClick={descargarRespaldo}
            >
              Descargar respaldo
            </button>
          </div>

          <div className="form-field">
            <label htmlFor="archivoRespaldo">Restaurar respaldo</label>
            <input
              id="archivoRespaldo"
              type="file"
              accept=".json,application/json"
              onChange={restaurarRespaldo}
            />
          </div>

          <form className="job-form" onSubmit={registrarEgreso}>
            <div className="form-field">
              <label htmlFor="conceptoEgreso">Concepto</label>
              <input
                id="conceptoEgreso"
                name="concepto"
                type="text"
                value={formularioEgreso.concepto}
                onChange={manejarCambioEgreso}
                placeholder="Ejemplo: impresión de fotos"
                required
              />
            </div>

            <div className="form-field">
              <label htmlFor="montoEgreso">Importe en pesos</label>
              <input
                id="montoEgreso"
                name="monto"
                type="number"
                min="0.01"
                step="0.01"
                value={formularioEgreso.monto}
                onChange={manejarCambioEgreso}
                required
              />
            </div>

            <div className="form-field">
              <label htmlFor="fechaEgreso">Fecha del egreso</label>
              <input
                id="fechaEgreso"
                name="fecha"
                type="date"
                min="2000-01-01"
                max="2100-12-31"
                value={formularioEgreso.fecha}
                onChange={manejarCambioEgreso}
                required
              />
            </div>

            <div className="form-field">
              <label htmlFor="trabajoEgreso">Trabajo relacionado (opcional)</label>
              <select
                id="trabajoEgreso"
                name="trabajoId"
                value={formularioEgreso.trabajoId}
                onChange={manejarCambioEgreso}
              >
                <option value="">Gasto general</option>
                {trabajos.map((trabajo) => (
                  <option key={trabajo.id} value={trabajo.id}>
                    {trabajo.cliente} · {trabajo.servicio}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-actions">
              {idEgresoEnEdicion !== null && (
                <button
                  className="cancel-button"
                  type="button"
                  onClick={() => {
                    setIdEgresoEnEdicion(null)
                    setFormularioEgreso(formularioEgresoInicial)
                  }}
                >
                  Cancelar edición
                </button>
              )}
              <button className="primary-button" type="submit">
                {idEgresoEnEdicion === null ? 'Registrar egreso' : 'Guardar cambios'}
              </button>
            </div>
          </form>
          <div className="expense-history">
            <h3>Egresos registrados</h3>

            <p>
              <strong>
                Total: {(egresos.reduce(
                  (suma, egreso) => suma + egreso.montoCentavos,
                  0,
                ) / 100).toLocaleString('es-AR', {
                  style: 'currency',
                  currency: 'ARS',
                })}
              </strong>
            </p>

            {egresos.length === 0 ? (
              <p>Todavía no hay egresos registrados.</p>
            ) : (
              <ul className="expense-list">
                {[...egresos].reverse().map((egreso) => (
                  <li key={egreso.id}>
                    <strong>{egreso.concepto}</strong>
                    <span>
                      {formatearFecha(egreso.fecha)} ·{' '}
                      {egreso.trabajoId === null
                        ? 'Gasto general'
                        : (trabajos.find(
                          (trabajo) => trabajo.id === egreso.trabajoId,
                        )?.cliente ?? 'Trabajo eliminado')}
                    </span>
                    <strong>
                      {(egreso.montoCentavos / 100).toLocaleString('es-AR', {
                        style: 'currency',
                        currency: 'ARS',
                      })}
                    </strong>

                    <button
                      className="detail-button"
                      type="button"
                      onClick={() => iniciarEdicionEgreso(egreso)}
                    >
                      Editar egreso
                    </button>
                    <button
                      className="detail-button"
                      type="button"
                      onClick={() => eliminarEgreso(egreso)}
                    >
                      Eliminar egreso
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

        </section>

        <section className="jobs-section">
          <div className="section-heading">
            <div>
              <p className="section-label">Agenda</p>
              <h2>Todos los trabajos</h2>
            </div>


          </div>

          <div className="jobs-grid">
            {trabajos.map((trabajo) => (
              <article className="job-card" key={trabajo.id}>
                <p className="job-date">{trabajo.fecha}</p>
                <h3>{trabajo.cliente}</h3>
                <p className="job-service">{trabajo.servicio}</p>

                <div className="job-footer">
                  <span className={`status ${trabajo.estadoClase}`}>
                    {trabajo.estado}
                  </span>

                  <button
                    className="detail-button"
                    type="button"
                    onClick={() => abrirDetalle(trabajo)}
                  >
                    Ver detalle
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div >
  )
}

export default App