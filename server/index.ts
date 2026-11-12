import { crearApp } from './app.ts'

const puerto = Number(process.env.PORT || 3001)
crearApp().listen(puerto, '127.0.0.1', () => {
  console.log(`API disponible en http://localhost:${puerto}/api/v1/salud`)
})
