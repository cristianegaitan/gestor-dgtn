import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { aplicarCambios } from '../src/lib/aplicarCambios.js'

function crearSupabaseFalso() {
  const filas = new Map()
  const clave = (tabla, usuario, id) => `${tabla}:${usuario}:${id}`

  function consultar(tabla) {
    let accion = 'select'
    let valores
    let filtros = []
    let campoOrden = 'id'

    const consulta = {
      select() { return this },
      insert(nuevosValores) { accion = 'insert'; valores = nuevosValores; return this },
      update(nuevosValores) { accion = 'update'; valores = nuevosValores; return this },
      delete() { accion = 'delete'; return this },
      eq(campo, valor) { filtros.push([campo, valor]); return this },
      order(campo) { campoOrden = campo; return this },
      then(resolver, rechazar) {
        const coincide = (fila) => filtros.every(([campo, valor]) => fila[campo] === valor)
        let data = []

        if (accion === 'insert') {
          const llave = clave(tabla, valores.usuario_id, valores.id)
          if (filas.has(llave)) {
            return Promise.resolve({ data: null, error: { code: '23505' } }).then(resolver, rechazar)
          }
          const fila = { ...valores }
          filas.set(llave, fila)
          data = [{ ...fila }]
        } else {
          const entradas = [...filas.entries()]
            .filter(([llave, fila]) => llave.startsWith(`${tabla}:`) && coincide(fila))
          if (accion === 'select') {
            data = entradas.map(([, fila]) => ({ ...fila }))
              .sort((a, b) => String(a[campoOrden]).localeCompare(String(b[campoOrden])))
          } else {
            for (const [llave, fila] of entradas) {
              if (accion === 'update') {
                assert.equal(valores.revision, undefined, 'La revisión debe incrementarla el servidor')
                const actualizada = { ...fila, ...valores, revision: fila.revision + 1 }
                filas.set(llave, actualizada)
                data.push({ ...actualizada })
              } else {
                filas.delete(llave)
                data.push({ ...fila })
              }
            }
          }
        }
        return Promise.resolve({ data, error: null }).then(resolver, rechazar)
      },
    }

    return consulta
  }

  return {
    auth: { getUser: async () => ({ data: { user: { id: 'usuario-1' } }, error: null }) },
    from: consultar,
    sembrar(tabla, registro, orden = 0) {
      filas.set(clave(tabla, 'usuario-1', registro.id), {
        usuario_id: 'usuario-1', id: registro.id, datos: registro, orden, revision: 0,
      })
    },
    obtener(tabla, id) { return filas.get(clave(tabla, 'usuario-1', id)) },
  }
}

const supabase = crearSupabaseFalso()
globalThis.__supabaseParaPrueba = supabase
const fuente = (await readFile(new URL('../src/lib/datosRemotos.js', import.meta.url), 'utf8'))
  .replace("import { supabase } from './supabaseClient'", 'const supabase = globalThis.__supabaseParaPrueba')
const datosRemotos = await import(`data:text/javascript;base64,${Buffer.from(fuente).toString('base64')}`)
delete globalThis.__supabaseParaPrueba

test('un cambio de pago desde otro dispositivo no se sobrescribe con una vista anterior', async () => {
  const original = { id: 1, cliente: 'Prueba', cuentasCobro: [{ id: 'c1', pagos: [] }] }
  supabase.sembrar('trabajos', original)
  const dispositivoA = await datosRemotos.cargarDatosRemotos()
  const dispositivoB = await datosRemotos.cargarDatosRemotos()

  const conPago = [{
    ...dispositivoA.trabajos[0],
    cuentasCobro: [{ id: 'c1', pagos: [{ id: 'p1', montoCentavos: 7000000 }] }],
  }]
  const revisionesA = await aplicarCambios(
    dispositivoA.trabajos, conPago, dispositivoA.revisionesTrabajos,
    (item, _orden, revision) => datosRemotos.guardarTrabajoRemoto(item, revision),
    datosRemotos.eliminarTrabajoRemoto,
  )
  assert.equal(revisionesA[1], 1)

  const cambioDesactualizado = [{ ...dispositivoB.trabajos[0], cliente: 'Nombre cambiado' }]
  await assert.rejects(
    aplicarCambios(
      dispositivoB.trabajos, cambioDesactualizado, dispositivoB.revisionesTrabajos,
      (item, _orden, revision) => datosRemotos.guardarTrabajoRemoto(item, revision),
      datosRemotos.eliminarTrabajoRemoto,
    ),
    datosRemotos.ConflictoRemotoError,
  )
  assert.deepEqual(supabase.obtener('trabajos', 1).datos.cuentasCobro[0].pagos, conPago[0].cuentasCobro[0].pagos)
  assert.equal(supabase.obtener('trabajos', 1).datos.cliente, 'Prueba')
  await assert.rejects(datosRemotos.eliminarTrabajoRemoto(1, 0), datosRemotos.ConflictoRemotoError)
})

test('un egreso desactualizado tampoco se pisa; un registro distinto puede guardarse', async () => {
  supabase.sembrar('egresos', { id: 'e1', montoCentavos: 10000 })
  supabase.sembrar('egresos', { id: 'e2', montoCentavos: 20000 }, 1)
  const vista = await datosRemotos.cargarDatosRemotos()
  const nuevaRevision = await datosRemotos.guardarEgresoRemoto(
    { id: 'e1', montoCentavos: 15000 }, 0, vista.revisionesEgresos.e1,
  )
  assert.equal(nuevaRevision, 1)
  await assert.rejects(
    datosRemotos.guardarEgresoRemoto({ id: 'e1', montoCentavos: 5000 }, 0, vista.revisionesEgresos.e1),
    datosRemotos.ConflictoRemotoError,
  )
  assert.equal(supabase.obtener('egresos', 'e1').datos.montoCentavos, 15000)
  assert.equal(await datosRemotos.guardarEgresoRemoto(
    { id: 'e2', montoCentavos: 25000 }, 1, vista.revisionesEgresos.e2,
  ), 1)
})

test('un registro nuevo obtiene revisión y solo se elimina con esa revisión', async () => {
  const trabajo = { id: 2, cliente: 'Nuevo', cuentasCobro: [] }
  assert.equal(await datosRemotos.guardarTrabajoRemoto(trabajo, null), 0)
  await assert.rejects(
    datosRemotos.guardarTrabajoRemoto({ ...trabajo, cliente: 'Duplicado' }, null),
    datosRemotos.ConflictoRemotoError,
  )
  assert.equal(await datosRemotos.guardarTrabajoRemoto({ ...trabajo, cliente: 'Editado' }, 0), 1)
  await assert.rejects(datosRemotos.eliminarTrabajoRemoto(2, 0), datosRemotos.ConflictoRemotoError)
  await datosRemotos.eliminarTrabajoRemoto(2, 1)
  assert.equal(supabase.obtener('trabajos', 2), undefined)
})
