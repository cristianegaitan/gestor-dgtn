import { useState, useSyncExternalStore } from 'react'
import App from './App'
import { crearAlmacenDemo } from './demo/almacenDemo'
import type { EstadoGestor } from './lib/estadoGestor'

function almacenamientoDePestana() {
  try { return window.sessionStorage } catch { return null }
}

export default function Demostracion() {
  const [almacen] = useState(() => crearAlmacenDemo(almacenamientoDePestana()))
  const estado = useSyncExternalStore(almacen.subscribe, almacen.getSnapshot)
  const datos: EstadoGestor = {
    trabajos: estado.datos.trabajos, egresos: estado.datos.egresos,
    setTrabajos: almacen.setTrabajos, setEgresos: almacen.setEgresos,
    errorCarga: '', errorGuardado: '', guardando: false, datosCargados: true,
  }

  function reiniciar() {
    if (window.confirm('¿Reiniciar la demostración y descartar los cambios de esta pestaña?')) almacen.reiniciar()
  }

  return (
    <>
      <aside className="demo-banner" aria-label="Modo demostración">
        <div>
          <p className="brand">Demostración interactiva</p>
          <strong>Probá Gestor DGTN</strong>
          <p>Datos ficticios. Podés crear trabajos, probar pagos y registrar egresos.
            Los cambios quedan en esta pestaña. Usá datos de ejemplo.</p>
          {estado.aviso && <p role="status">{estado.aviso}</p>}
        </div>
        <div className="demo-actions">
          <button className="secondary-button" type="button" onClick={reiniciar}>Reiniciar demo</button>
          <a className="secondary-button" href="/">Ir a mi cuenta</a>
        </div>
      </aside>
      <App key={estado.reinicios} datos={datos} demostracion />
    </>
  )
}
