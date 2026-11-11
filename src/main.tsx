import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import Acceso from './Acceso'

const raiz = document.getElementById('root')
if (!raiz) throw new Error('No se encontró el elemento raíz de la aplicación.')

createRoot(raiz).render(
  <StrictMode>
    <Acceso>
      <App />
    </Acceso>
  </StrictMode>,
)
