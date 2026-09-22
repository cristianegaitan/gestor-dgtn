import './App.css'

const resumen = [
  {
    id: 1,
    etiqueta: 'Próximos eventos',
    valor: 3,
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

const trabajos = [
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

function App() {
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

        <button className="primary-button" type="button">
          + Nuevo trabajo
        </button>
      </header>

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