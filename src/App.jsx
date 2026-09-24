import { useEffect, useState } from 'react'
import './App.css'

const CLAVE_TRABAJOS = 'gestor-dgtn-trabajos'

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

function App() {
  const [trabajos, setTrabajos] = useState(obtenerTrabajosGuardados)
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [formulario, setFormulario] = useState(formularioInicial)
  const [formularioCuenta, setFormularioCuenta] = useState({
    nombre: '',
    total: '',
  })
  const [idTrabajoSeleccionado, setTrabajoSeleccionado] = useState(null)
  const [idTrabajoEnEdicion, setIdTrabajoEnEdicion] = useState(null)

  useEffect(() => {
    localStorage.setItem(CLAVE_TRABAJOS, JSON.stringify(trabajos))
  }, [trabajos])

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

  function manejarCambioCuenta(evento) {
    const { name, value } = evento.target

    setFormularioCuenta((datosActuales) => ({
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

              <article className="detail-card">
                <h3>Pagos</h3>
                <p>
                  Cuentas de cobro: {(trabajoSeleccionado.cuentasCobro ?? []).length}
                </p>

                {(trabajoSeleccionado.cuentasCobro ?? []).length > 0 && (
                  <ul className="account-list">
                    {(trabajoSeleccionado.cuentasCobro ?? []).map((cuenta) => (
                      <li key={cuenta.id}>
                        <strong>{cuenta.nombre}</strong>
                        <span>
                          {cuenta.totalCentavos === null
                            ? 'Total sin registrar'
                            : (cuenta.totalCentavos / 100).toLocaleString('es-AR', {
                              style: 'currency',
                              currency: 'ARS',
                            })}
                        </span>
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
                    Agregar cuenta
                  </button>
                </form>
              </article>

              <article className="detail-card">
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