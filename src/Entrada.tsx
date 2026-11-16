import { lazy, Suspense } from 'react'
import { esRutaDemo } from './demo/rutaDemo'

// La demo no importa el acceso privado ni inicializa su cliente Supabase.
const Demostracion = lazy(() => import('./Demostracion'))
const AplicacionPrivada = lazy(() => import('./AplicacionPrivada'))

export default function Entrada() {
  return (
    <Suspense fallback={<p role="status">Cargando Gestor DGTN...</p>}>
      {esRutaDemo(window.location.pathname) ? <Demostracion /> : <AplicacionPrivada />}
    </Suspense>
  )
}
