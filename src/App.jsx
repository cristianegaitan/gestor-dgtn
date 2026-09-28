import { useEffect, useState } from 'react'
import './App.css'

const CLAVE_TRABAJOS = 'gestor-dgtn-trabajos'

const CLAVE_EGRESOS = 'gestor-dgtn-egresos'

function obtenerEgresosGuardados() {
  try {
    const egresosGuardados = JSON.parse(
      localStorage.getItem(CLAVE_EGRESOS) ?? '[]',
    )
    return Array.isArray(egresosGuardados) ? egresosGuardados : []
  } catch {
    return []
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
}

const formularioEgresoInicial = {
  concepto: '',
  monto: '',
  fecha: '',
  trabajoId: '',
}

function obtenerTrabajosGuardados() {
  const trabajosGuardados = localStorage.getItem(CLAVE_TRABAJOS)

  if (!trabajosGuardados) {
    return trabajosIniciales
  }

  try {
    return JSON.parse(trabajosGuardados)
  } catch {
    return trabajosIniciales
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

  useEffect(() => {
    localStorage.setItem(CLAVE_TRABAJOS, JSON.stringify(trabajos))
  }, [trabajos])

  useEffect(() => {
    localStorage.setItem(CLAVE_EGRESOS, JSON.stringify(egresos))
  }, [egresos])

  const trabajoSeleccionado =
    trabajos.find((trabajo) => trabajo.id === idTrabajoSeleccionado) ?? null

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
  ]

  function manejarCambio(evento) {
    const { name, value } = evento.target

    setFormulario((formularioActual) => ({
      ...formularioActual,
      [name]: value,
    }))
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
      id: Date.now(),
      cliente: formulario.cliente.trim(),
      servicio: formulario.servicio.trim(),
      fechaISO: formulario.fecha,
      fecha: formatearFecha(formulario.fecha),
      estado: formulario.estado,
      estadoContrato: formulario.estadoContrato,
      enlaceDrive: formulario.enlaceDrive.trim(),
      enlacePixieset: formulario.enlacePixieset.trim(),
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
    setTrabajoSeleccionado(null)
    setMostrarFormulario(true)
  }

  function abrirDetalle(trabajo) {
    setIdCuentaEnEdicion(null)
    setFormularioCuenta({ nombre: '', total: '' })
    setTrabajoSeleccionado(trabajo.id)
    setMostrarFormulario(false)
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