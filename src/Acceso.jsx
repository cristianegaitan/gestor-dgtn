import { useEffect, useState } from 'react'
import { supabase } from './lib/supabaseClient'

export default function Acceso({ children }) {
  const [sesion, setSesion] = useState(undefined)
  const [correo, setCorreo] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data, error: errorSesion }) => {
      setSesion(errorSesion ? null : data.session)
    })

    const { data: suscripcion } = supabase.auth.onAuthStateChange(
      (_evento, nuevaSesion) => setSesion(nuevaSesion),
    )

    return () => suscripcion.subscription.unsubscribe()
  }, [])

  async function iniciarSesion(evento) {
    evento.preventDefault()
    setError('')
    setEnviando(true)

    const { error: errorIngreso } = await supabase.auth.signInWithPassword({
      email: correo.trim(),
      password: contrasena,
    })

    if (errorIngreso) {
      setError('No se pudo ingresar. Revisá el correo y la contraseña.')
    }

    setEnviando(false)
  }

  if (sesion === undefined) {
    return <p>Comprobando acceso...</p>
  }

  if (!sesion) {
    return (
      <div className="app-shell">
        <main className="form-panel">
          <h1>Ingresar a Gestor DGTN</h1>
          <form className="job-form" onSubmit={iniciarSesion}>
            <div className="form-field">
              <label htmlFor="correo-acceso">Correo electrónico</label>
              <input
                id="correo-acceso"
                type="email"
                autoComplete="email"
                required
                value={correo}
                onChange={(evento) => setCorreo(evento.target.value)}
              />
            </div>

            <div className="form-field">
              <label htmlFor="contrasena-acceso">Contraseña</label>
              <input
                id="contrasena-acceso"
                type="password"
                autoComplete="current-password"
                required
                value={contrasena}
                onChange={(evento) => setContrasena(evento.target.value)}
              />
            </div>

            {error && <p role="alert">{error}</p>}

            <button className="primary-button" type="submit" disabled={enviando}>
              {enviando ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>
        </main>
      </div>
    )
  }

  return (
    <>
      <button type="button" onClick={() => supabase.auth.signOut()}>
        Cerrar sesión
      </button>
      {children}
    </>
  )
}