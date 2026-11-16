import assert from 'node:assert/strict'
import { beforeEach, afterEach, after, test } from 'node:test'
import { createElement, StrictMode } from 'react'
import { JSDOM } from 'jsdom'

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://gestor.test/demo' })
Object.assign(globalThis, {
  window: dom.window, document: dom.window.document,
  HTMLElement: dom.window.HTMLElement, HTMLInputElement: dom.window.HTMLInputElement,
  Node: dom.window.Node, IS_REACT_ACT_ENVIRONMENT: true,
})
dom.window.scrollTo = () => {}
dom.window.confirm = () => true
const fetchOriginal = globalThis.fetch
const solicitudes = []

// Importar después de preparar el DOM permite probar los eventos de React.
const { render, cleanup, fireEvent, screen, within } = await import('@testing-library/react/pure')
const { default: Entrada } = await import('../src/Entrada.tsx')

beforeEach(() => {
  dom.window.sessionStorage.clear()
  dom.window.localStorage.setItem('sb-sesion-privada', 'sesion-ficticia-para-prueba')
  solicitudes.length = 0
  globalThis.fetch = async (...argumentos) => {
    solicitudes.push(argumentos)
    throw new Error('La demostración no debe solicitar datos de la red')
  }
  dom.window.fetch = globalThis.fetch
})

afterEach(() => {
  cleanup()
  globalThis.fetch = fetchOriginal
  assert.deepEqual(solicitudes, [], 'La demo debe funcionar sin llamar a la API o Supabase')
  assert.equal(dom.window.localStorage.getItem('sb-sesion-privada'), 'sesion-ficticia-para-prueba')
})
after(() => { dom.window.close() })

async function abrir() {
  render(createElement(StrictMode, null, createElement(Entrada)))
  await screen.findByRole('heading', { name: 'Panel de trabajo' })
}

function cambiar(etiqueta, valor) {
  fireEvent.change(screen.getByLabelText(etiqueta), { target: { value: valor } })
}

function abrirTrabajo(nombre) {
  const tarjeta = screen.getByRole('heading', { name: nombre }).closest('article')
  fireEvent.click(within(tarjeta).getByRole('button', { name: 'Ver detalle' }))
}

test('la demo pública permite crear, recargar, editar y eliminar un trabajo sin tocar la sesión privada', async () => {
  await abrir()
  assert.equal(screen.queryByLabelText('Correo electrónico'), null)
  assert.ok(screen.getByLabelText('Modo demostración'))
  fireEvent.click(screen.getByRole('button', { name: '+ Nuevo trabajo' }))
  cambiar('Cliente', 'Trabajo ficticio agregado')
  cambiar('Servicio', 'Fotografía')
  cambiar('Fecha del evento', '2026-12-20')
  fireEvent.click(screen.getByRole('button', { name: 'Guardar trabajo' }))
  assert.ok(screen.getByRole('heading', { name: 'Trabajo ficticio agregado' }))
  cleanup()
  await abrir()
  abrirTrabajo('Trabajo ficticio agregado')
  fireEvent.click(screen.getByRole('button', { name: 'Editar trabajo' }))
  cambiar('Cliente', 'Trabajo ficticio editado')
  fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))
  assert.ok(screen.getByRole('heading', { name: 'Trabajo ficticio editado' }))
  abrirTrabajo('Trabajo ficticio editado')
  fireEvent.click(screen.getByRole('button', { name: 'Eliminar trabajo' }))
  cleanup()
  await abrir()
  assert.equal(screen.queryByRole('heading', { name: 'Trabajo ficticio editado' }), null)
})

test('un pago de demo solo reduce el saldo al confirmarlo y el resultado persiste al recargar', async () => {
  await abrir()
  assert.ok(screen.getByText(/1\.000\.000,00/))
  abrirTrabajo('Boda de Lucía y Mateo (ejemplo)')
  cambiar('Cuenta del pago', 'demo-cuenta-1')
  cambiar('Monto en pesos', '100000')
  cambiar('Fecha del movimiento', '2026-11-16')
  fireEvent.click(screen.getByRole('button', { name: 'Registrar pago' }))
  assert.ok(screen.getByText(/1\.000\.000,00/))
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar pago' }))
  assert.ok(screen.getByText(/900\.000,00/))
  cleanup()
  await abrir()
  assert.ok(screen.getByText(/900\.000,00/))
})

test('reiniciar restaura los ejemplos y cierra formularios que estaban abiertos', async () => {
  await abrir()
  abrirTrabajo('Boda de Lucía y Mateo (ejemplo)')
  fireEvent.click(screen.getByRole('button', { name: 'Eliminar trabajo' }))
  fireEvent.click(screen.getByRole('button', { name: '+ Nuevo trabajo' }))
  assert.ok(screen.getByRole('heading', { name: 'Agregar trabajo' }))
  fireEvent.click(screen.getByRole('button', { name: 'Reiniciar demo' }))
  assert.equal(screen.queryByRole('heading', { name: 'Agregar trabajo' }), null)
  assert.ok(screen.getByRole('heading', { name: 'Boda de Lucía y Mateo (ejemplo)' }))
  assert.ok(screen.getByText(/1\.000\.000,00/))
})

test('un egreso ficticio se guarda y se elimina tras recargar sin acceder a datos remotos', async () => {
  await abrir()
  cambiar('Concepto', 'Egreso ficticio agregado')
  cambiar('Importe en pesos', '1000')
  cambiar('Fecha del egreso', '2026-11-16')
  cambiar('Trabajo relacionado (opcional)', '1')
  fireEvent.click(screen.getByRole('button', { name: 'Registrar egreso' }))
  cleanup()
  await abrir()
  const registro = screen.getByText('Egreso ficticio agregado').closest('li')
  assert.ok(within(registro).getByText(/1\.000,00/))
  fireEvent.click(within(registro).getByRole('button', { name: 'Eliminar egreso' }))
  cleanup()
  await abrir()
  assert.equal(screen.queryByText('Egreso ficticio agregado'), null)
})
