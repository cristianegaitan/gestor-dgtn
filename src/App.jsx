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
  }).format(fechaLocal)
}

function App() {
  const [trabajos, setTrabajos] = useState(obtenerTrabajosGuardados)
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [formulario, setFormulario] = useState(formularioInicial)

  useEffect(() => {
    localStorage.setItem(CLAVE_TRABAJOS, JSON.stringify(trabajos))
  }, [trabajos])

  const resumen = [
    {
      id: 1,
      etiqueta: 'Próximos eventos',
      valor: trabajos.length,
      detalle: 'En los próximos 30 días',
    },
    {
      id: 2,
      etiqueta: 'Trabajos en edición',
      valor: 2,
      detalle: 'Pendientes de finalizar',
    },
    {
      id: 3,
      etiqueta: 'Entregas pendientes',
      valor: 1,
      detalle: 'Esperando envío al cliente',
    },
  ]

  function manejarCambio(evento) {
    const { name, value } = evento.target

    setFormulario((formularioActual) => ({
      ...formularioActual,
      [name]: value,
    }))
  }

  function cerrarFormulario() {
    setFormulario(formularioInicial)
    setMostrarFormulario(false)
  }

  function manejarEnvio(evento) {
    evento.preventDefault()

    const nuevoTrabajo = {
      id: Date.now(),
      cliente: formulario.cliente.trim(),
      servicio: formulario.servicio.trim(),
      fecha: formatearFecha(formulario.fecha),
      estado: formulario.estado,
      estadoClase:
        formulario.estado === 'Confirmado'
          ? 'confirmado'
          : 'planificacion',
    }

    setTrabajos((trabajosActuales) => [
      ...trabajosActuales,
      nuevoTrabajo,
    ])

    cerrarFormulario()
  }

  function manejarBotonFormulario() {
    if (mostrarFormulario) {
      cerrarFormulario()
      return
    }

    setMostrarFormulario(true)
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
            <p className="section-label">Nuevo registro</p>
            <h2 id="form-title">Agregar trabajo</h2>
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

            <div className="form-actions">
              <button
                className="cancel-button"
                type="button"
                onClick={cerrarFormulario}
              >
                Cancelar
              </button>

              <button className="primary-button" type="submit">
                Guardar trabajo
              </button>
            </div>
          </form>
        </section>
      )}

      <main className="dashboard">
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
              <h2>Próximos trabajos</h2>
            </div>

            <button className="secondary-button" type="button">
              Ver todos
            </button>
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

                  <button className="detail-button" type="button">
                    Ver detalle
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}

export default App