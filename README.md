# Gestor DGTN

Aplicación de gestión para trabajos de fotografía y video. Permite administrar eventos, cuentas de cobro, pagos, egresos y entregas desde el navegador.

## Probar la demostración

La [demostración pública](https://tangerine-panda-3a3a2d.netlify.app/demo) permite recorrer el gestor sin iniciar sesión, con tres trabajos ficticios, cuentas de cobro, pagos y egresos. En desarrollo local está en `http://localhost:5173/demo`, usando el puerto que indique Vite.

Se pueden crear, editar y borrar registros, confirmar pagos y probar los respaldos. Los cambios se guardan en `sessionStorage`, solo para esa pestaña, y sobreviven a una recarga mientras esa sesión esté disponible. «Reiniciar demo» recupera los ejemplos y cierra los formularios abiertos. Los respaldos descargados se identifican con el prefijo `gestor-dgtn-demo-`.

La demo tiene un almacenamiento y una entrada separados: no carga el cliente privado de Supabase, no llama a la API y no necesita credenciales. Funciona también si el servicio remoto está pausado. Si el navegador no permite guardar, se puede seguir probando en memoria y aparece un aviso al modificar datos. Usar datos ficticios para las pruebas.

El enlace «Ir a mi cuenta» abre la aplicación autenticada. La demo muestra la interfaz y sus operaciones locales; no sustituye las pruebas de la API ni de las políticas RLS. El backend real se usa al iniciar sesión en la aplicación privada.

## Tecnologías

React, TypeScript en modo estricto, Vite, Node.js, Express 5 y Supabase (autenticación y PostgreSQL). La interfaz se adapta a computadoras y celulares. La persistencia del navegador pasa por una API REST propia; el inicio de sesión continúa usando Supabase Auth.

## Funcionalidades

- Crear, editar y eliminar trabajos y egresos.
- Administrar cuentas de cobro y registrar, editar, confirmar o eliminar pagos.
- Consultar saldos pendientes y una fecha guía de entrega a seis semanas.
- Registrar enlaces de entrega y el estado de contratos y pendrives.
- Descargar y restaurar respaldos JSON, con validación de su contenido.
- Detectar escrituras desactualizadas mediante revisiones de cada registro.

## Desarrollo local

Recomendado: Node.js 24 LTS desde 24.15. También se admite Node.js 22 desde 22.22.2 y Node.js 26 o posterior. Las pruebas de interfaz usan jsdom; estos mínimos mantienen compatibilidad con esa dependencia. Las pruebas que importan TSX se ejecutan con `tsx`.

```bash
npm ci
cp .env.example .env.local
```

En `.env.local`, completar la URL y la clave publicable del proyecto Supabase. Nunca colocar una clave `service_role` en el frontend. Los archivos de configuración local están excluidos de Git.

```bash
npm run dev
```

La dirección local se muestra en la terminal. Ingresar con una cuenta del mismo proyecto Supabase configurado en las variables de entorno.

El mismo comando inicia la interfaz y la API Express en el mismo origen. En `http://localhost:5173/api/v1/salud` se puede comprobar que la API responde, usando el puerto que indique Vite si el 5173 está ocupado. Ese endpoint no comprueba la disponibilidad de Supabase.

Para ejecutar exclusivamente el servidor, sin Vite:

```bash
npm run dev:api
```

Por defecto escucha en `127.0.0.1:3001`; se puede configurar `PORT`. `npm run preview` también incorpora la API para probar la compilación local.

## API REST

Base: `/api/v1`. Salvo `/salud`, todas las rutas requieren `Authorization: Bearer <access_token>` con una sesión Supabase válida. La API verifica el token con Supabase Auth en cada petición, crea un cliente independiente con ese token y filtra por el usuario autenticado. Usa la clave publicable, sin omitir las políticas RLS. No recibe `usuario_id` del navegador ni usa una clave `service_role`.

Las siguientes operaciones se aplican a los recursos `trabajos` y `egresos`:

| Método | Ruta | Resultado |
| --- | --- | --- |
| GET | `/trabajos?limite=100&offset=0` | `{ registros: [{ datos, revision }], siguienteOffset }` |
| GET | `/trabajos/:id` | `{ datos, revision }` y cabecera ETag |
| POST | `/trabajos` | Crea un registro; devuelve 201, `{ revision }`, Location y ETag |
| PUT | `/trabajos/:id` | Reemplaza los datos si coincide If-Match; devuelve `{ revision }` y ETag |
| DELETE | `/trabajos/:id` | Elimina si coincide If-Match; devuelve 204 |

POST y PUT reciben `{ "datos": <Trabajo> }`. Para egresos reciben `{ "datos": <Egreso>, "orden": 0 }`. El ID dentro de `datos` debe coincidir con el de la URL en una actualización. Los datos se validan en el servidor con las mismas reglas de compatibilidad que los respaldos. Las cuentas y los pagos se guardan dentro del trabajo completo, como antes.

PUT y DELETE exigen la revisión leída en una cabecera como `If-Match: "0"`. La API no permite sobrescrituras incondicionales. La base incrementa la revisión mediante el trigger existente. Las respuestas de datos no se cachean. El cliente obtiene todas las páginas; cada petición permite de 1 a 100 registros.

Formato de errores: `{ "error": { "codigo": "...", "mensaje": "..." } }`.

| Estado | Significado |
| --- | --- |
| 400 | Datos, ID, paginación, JSON o revisión inválidos |
| 401 | Sesión ausente, vencida o inválida |
| 403 | Operación denegada por las políticas de acceso |
| 404 | Registro propio o ruta no encontrados |
| 409 | El registro que se intenta crear ya existe |
| 412 | La revisión cambió o el registro ya no está disponible para ese usuario |
| 413 / 415 | Cuerpo mayor a 1 MB / tipo de contenido no admitido |
| 428 | Falta If-Match en una modificación o eliminación |
| 503 | Configuración ausente o servicio Supabase no disponible |

409 y 412 activan el aviso de conflicto y detienen nuevas escrituras en la interfaz. Un fallo de red tampoco provoca reintentos automáticos de escritura, porque podría haberse guardado el cambio aunque su respuesta no haya llegado.

## Publicación en Netlify

`netlify.toml` configura la compilación de Vite, Node 24, la función Express y la redirección de `/api/*`. Interfaz y API se publican juntas; no se necesita otro servicio de alojamiento ni habilitar CORS para el uso normal del gestor.

Antes de publicar, comprobar que `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY` estén disponibles tanto para **Builds** como para **Functions** en Netlify. Si las variables actuales solo están disponibles durante la compilación, ampliar su alcance. Alternativamente, definir `SUPABASE_URL` y `SUPABASE_PUBLISHABLE_KEY` para Functions; la API prioriza esos nombres. Nunca usar una clave `service_role` o `sb_secret_`.

Después del despliegue, verificar `/api/v1/salud` y una operación autenticada con datos de prueba. Actualizar las pestañas abiertas. La función está sujeta a los límites de ejecución y consumo del plan de Netlify.

## Base de datos

El repositorio incluye el esquema completo de instalación de las tablas `trabajos` y `egresos`, sus permisos, políticas RLS por usuario, índices y revisiones. Cada tabla guarda el contenido en `datos` (JSONB), junto con `id` y `usuario_id`; `egresos` también utiliza `orden`.

Para un **proyecto Supabase nuevo**, ejecutar primero `supabase/migrations/20261012_esquema_inicial.sql` y después `supabase/migrations/20261013_registro_revisiones.sql`. La primera crea la estructura y la segunda agrega la columna `revision` y los triggers para incrementarla al actualizar. Los roles y componentes de Auth los proporciona Supabase.

El proyecto publicado ya tiene sus tablas. Esta entrega no requiere ejecutar SQL allí: el esquema inicial se detiene si encuentra tablas existentes. La migración de revisiones que ya fue aplicada se conserva sin cambios.

Ver [la guía de base de datos](supabase/README.md) para instalar desde cero, entender el modelo, revisar los límites de JSONB y comparar el esquema de una instalación existente antes de adoptar cambios de SQL.

## Comprobaciones

```bash
npm run typecheck
npm run lint
npm test
npm run test:db
npm run build
```

`build` verifica los tipos del frontend y del servidor antes de generar `dist`. Vite transforma TypeScript, pero la comprobación estática la realiza `tsc`.

Las pruebas HTTP ejecutan Express, el adaptador serverless y supabase-js reales, simulando únicamente las respuestas externas de Supabase. Comprueban autenticación, separación por usuario, validación, paginación, CRUD y conflictos de revisión. Las pruebas de respaldo mantienen la cobertura del formato anterior.

Las pruebas de base de datos ejecutan las migraciones reales en PostgreSQL embebido con PGlite, con roles sin privilegios de administrador para comprobar RLS. `npm run test:db` permite correr solo ese grupo, que ya está incluido en `npm test`. No requieren credenciales ni escriben en Supabase. Los servicios Auth y PostgREST y las políticas del proyecto remoto requieren además verificación contra ese entorno; estas pruebas locales no certifican su configuración.

Las pruebas de interfaz usan React Testing Library y jsdom para montar la entrada pública en StrictMode. Comprueban creación, edición, borrado, recarga, confirmación de pagos y reinicio de la demo. Rechazan cualquier llamada a `fetch` durante esas operaciones y comprueban que una sesión privada de prueba en `localStorage` se conserve. Estas pruebas no sustituyen la inspección visual en navegadores reales.

## Comprobaciones automáticas en GitHub

El workflow [Comprobaciones](.github/workflows/comprobaciones.yml) ejecuta `npm ci`, `npm run lint`, `npm test` y `npm run build`, en ese orden, con Node.js 24. La compilación incluye la revisión de tipos del frontend y del servidor.

Se activa al subir cambios a `main` o a ramas `codex/**`, al abrir o actualizar un pull request dirigido a `main`, y manualmente desde Actions una vez incorporado el archivo a la rama principal. Las pruebas SQL ya están incluidas en `npm test`.

Los resultados se consultan en [Actions del repositorio](https://github.com/cristianegaitan/gestor-dgtn/actions). Abrir una ejecución y luego el trabajo «Lint, pruebas y compilación» permite ver el paso que falló y su salida. Si se cancela una ejecución al subir un cambio nuevo a la misma rama, revisar la más reciente.

La comprobación usa valores ficticios de Supabase, sin contraseñas ni secretos del proyecto real. No requiere configurar secrets en GitHub y no ejecuta SQL en Supabase. Las acciones externas están fijadas a commits concretos y el token del workflow solo tiene permiso de lectura del contenido.

Este workflow comprueba el código y muestra su resultado. Para exigir una comprobación aprobada antes de fusionar un pull request hace falta configurar además una regla de protección de `main` en GitHub. La publicación automática de Netlify sigue su configuración actual y no espera este workflow por el solo hecho de agregar el archivo.

## Organización

- `src/Entrada.tsx`: selección de la entrada privada o la demostración por URL.
- `src/AplicacionPrivada.tsx`: acceso autenticado y conexión con los datos remotos.
- `src/Demostracion.tsx` y `src/demo/`: demostración pública y almacenamiento por pestaña.
- `src/App.tsx`: panel, formularios y operaciones de gestión compartidos por ambas entradas.
- `src/Acceso.tsx`: inicio y cierre de sesión.
- `src/types.ts`: contratos de trabajos, cuentas, pagos, egresos y respaldos.
- `src/lib/validaciones.ts`: comprobación de datos externos y respaldos.
- `src/lib/useDatosRemotos.ts`: carga, cola de guardado y estado de sincronización.
- `src/lib/datosRemotos.ts`: conexión de la sesión con el cliente de la API.
- `src/lib/clienteDatosApi.ts`: peticiones REST, carga paginada y control de conflictos.
- `src/lib/aplicarCambios.ts`: diferencias entre colecciones y persistencia.
- `server/app.ts`: rutas Express, autenticación, validación y errores HTTP.
- `server/repositorio.ts`: consultas a Supabase filtradas por usuario y revisión.
- `server/configuracion.ts`: cliente Supabase independiente por petición.
- `netlify/functions/api.ts`: entrada del backend en Netlify.
- `supabase/migrations/`: instalación versionada del esquema y de las revisiones.
- `supabase/diagnosticos/`: consulta de metadatos de una instalación existente.
- `.github/workflows/comprobaciones.yml`: comprobaciones automáticas con GitHub Actions.
- `tests/`: pruebas HTTP, sincronización, respaldos y SQL con RLS.

## Sincronización y recuperación

Una modificación o eliminación debe coincidir con la revisión leída. Ante un conflicto o fallo de guardado, la aplicación muestra un aviso y detiene nuevas escrituras. Descargar un respaldo de los cambios locales antes de recargar y comparar con los datos del servidor antes de restaurarlo.

Las operaciones sobre varios registros no forman una sola transacción: algunos cambios pueden haberse guardado antes de un conflicto. Tras publicar una versión nueva, actualizar las pestañas abiertas en todos los dispositivos. Un cliente anterior sin control de revisión no obtiene esa protección.
