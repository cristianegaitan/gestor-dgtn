import { supabase } from './supabaseClient'
import { crearClienteDatosApi } from './clienteDatosApi'

export { ConflictoRemotoError } from './clienteDatosApi'

const cliente = crearClienteDatosApi(async () => {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  if (!data.session) throw new Error('No hay una sesión activa. Volvé a ingresar.')
  return data.session.access_token
})

export const {
  cargarDatosRemotos,
  guardarTrabajoRemoto,
  guardarEgresoRemoto,
  eliminarTrabajoRemoto,
  eliminarEgresoRemoto,
} = cliente
