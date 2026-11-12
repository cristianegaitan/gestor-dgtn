import assert from 'node:assert/strict'
import test from 'node:test'
import { crearClienteDatosApi } from '../src/lib/clienteDatosApi.ts'
import { trabajo } from './helpers/api.mjs'

test('una respuesta con datos, revisiones o paginación inválidos impide cargar el panel', async () => {
  const paginas = [
    { registros: [{ datos: trabajo(), revision: -1 }], siguienteOffset: null },
    { registros: [{ datos: { ...trabajo(), cliente: null }, revision: 0 }], siguienteOffset: null },
    { registros: [], siguienteOffset: 0 },
    { registros: [{ datos: trabajo(), revision: 0 }], siguienteOffset: 999 },
    { registros: [{ datos: trabajo(), revision: 0 }, { datos: trabajo(), revision: 0 }], siguienteOffset: null },
  ]
  for (const pagina of paginas) {
    const cliente = crearClienteDatosApi(async () => 'token', async (ruta) => Response.json(
      ruta.includes('/trabajos') ? pagina : { registros: [], siguienteOffset: null },
    ))
    await assert.rejects(cliente.cargarDatosRemotos())
  }
})

test('el cliente no confirma un guardado sin revisión ni reintenta una escritura fallida', async () => {
  for (const respuesta of [() => Response.json({ revision: null }), () => { throw new TypeError('Sin conexión') }]) {
    let llamadas = 0
    const cliente = crearClienteDatosApi(async () => 'token', async () => { llamadas++; return respuesta() })
    await assert.rejects(cliente.guardarTrabajoRemoto(trabajo(), null))
    assert.equal(llamadas, 1)
  }
})
