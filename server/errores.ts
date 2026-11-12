export class ErrorApi extends Error {
  readonly estado: number
  readonly codigo: string

  constructor(estado: number, codigo: string, mensaje: string) {
    super(mensaje)
    this.name = 'ErrorApi'
    this.estado = estado
    this.codigo = codigo
  }
}

export function conflicto(): ErrorApi {
  return new ErrorApi(412, 'REVISION_DESACTUALIZADA',
    'Este registro cambió en otro dispositivo. Recargá antes de modificarlo.')
}
