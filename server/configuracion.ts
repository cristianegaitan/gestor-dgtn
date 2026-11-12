import { createClient } from '@supabase/supabase-js'
import { ErrorApi } from './errores.ts'

export function crearClienteUsuario(token: string, entorno = process.env) {
  const url = entorno.SUPABASE_URL || entorno.VITE_SUPABASE_URL
  const clave = entorno.SUPABASE_PUBLISHABLE_KEY || entorno.VITE_SUPABASE_PUBLISHABLE_KEY
  if (!url || !clave) {
    throw new ErrorApi(503, 'API_SIN_CONFIGURAR',
      'Falta configurar la conexión de la API con Supabase.')
  }
  // Un cliente por petición: ninguna sesión se comparte entre usuarios.
  // La clave publicable y el token del usuario mantienen activas las políticas RLS.
  return createClient(url, clave, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
}
