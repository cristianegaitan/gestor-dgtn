import type { IdRegistro, Revisiones } from '../types'

function obtenerRevision(revisiones: Revisiones, id: IdRegistro): number {
  const revision = revisiones[id]
  if (typeof revision !== 'number' || !Number.isSafeInteger(revision) || revision < 0) {
    throw new Error('No se conoce la revisión del registro. Recargá antes de modificarlo.')
  }
  return revision
}

export async function aplicarCambios<T extends { id: IdRegistro }>(
  anteriores: readonly T[],
  actuales: readonly T[],
  revisiones: Revisiones,
  guardar: (registro: T, orden: number, revision: number | null) => Promise<number>,
  eliminar: (id: T['id'], revision: number) => Promise<void>,
  incluirOrden = false,
): Promise<Revisiones> {
  const anterioresPorId = new Map(
    anteriores.map((item, orden) => [item.id, { item, orden }]),
  )
  const idsActuales = new Set(actuales.map((item) => item.id))
  const nuevasRevisiones = { ...revisiones }

  for (const [orden, item] of actuales.entries()) {
    const anterior = anterioresPorId.get(item.id)
    if (
      !anterior ||
      JSON.stringify(anterior.item) !== JSON.stringify(item) ||
      (incluirOrden && anterior.orden !== orden)
    ) {
      const revision = anterior ? obtenerRevision(revisiones, item.id) : null
      nuevasRevisiones[item.id] = await guardar(item, orden, revision)
    }
  }

  for (const item of anteriores) {
    if (!idsActuales.has(item.id)) {
      await eliminar(item.id, obtenerRevision(revisiones, item.id))
      delete nuevasRevisiones[item.id]
    }
  }

  return nuevasRevisiones
}
