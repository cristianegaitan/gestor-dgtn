import Acceso from './Acceso'
import App from './App'
import { useDatosRemotos } from './lib/useDatosRemotos'

function PanelPrivado() {
  const datos = useDatosRemotos()
  return <App datos={datos} />
}

export default function AplicacionPrivada() {
  return <Acceso><PanelPrivado /></Acceso>
}
