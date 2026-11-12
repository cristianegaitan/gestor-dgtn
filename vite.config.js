import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { crearApp } from './server/app.ts'
import { crearClienteUsuario } from './server/configuracion.ts'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  function configurarApi(servidor) {
    const entorno = { ...loadEnv(mode, process.cwd(), ''), ...process.env }
    const app = crearApp((token) => crearClienteUsuario(token, entorno))
    servidor.middlewares.use((req, res, next) => {
      if (req.url?.startsWith('/api/')) app(req, res, next)
      else next()
    })
  }
  return {
    plugins: [react(), {
      name: 'api-local',
      configureServer: configurarApi,
      configurePreviewServer: configurarApi,
    }],
  }
})
