export async function aplicarCambios(
  anteriores,
  actuales,
  revisiones,
  guardar,
  eliminar,
  incluirOrden = false,
) {
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
      const revision = anterior ? revisiones[item.id] : null
      nuevasRevisiones[item.id] = await guardar(item, orden, revision)
    }
  }

  for (const item of anteriores) {
    if (!idsActuales.has(item.id)) {
      await eliminar(item.id, revisiones[item.id])
      delete nuevasRevisiones[item.id]
    }
  }

  return nuevasRevisiones
}
