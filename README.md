# Gestor DGTN

Aplicación de gestión para trabajos de fotografía y video. Permite administrar eventos, cuentas de cobro, pagos, egresos y entregas desde el navegador.

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

Recomendado: Node.js 24 LTS. Mínimo: Node.js 22.18, para ejecutar los módulos TypeScript de las pruebas sin un compilador adicional en tiempo de ejecución.

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

El proyecto Supabase debe tener las tablas `trabajos` y `egresos`, con sus políticas de acceso por usuario configuradas. Cada tabla guarda el contenido en `datos` (JSONB), junto con `id` y `usuario_id`; `egresos` también utiliza `orden`.

La migración `supabase/migrations/20261013_registro_revisiones.sql` agrega la columna `revision` y los triggers para incrementarla al actualizar. Esa migración presupone las tablas existentes; no crea la base de datos completa desde cero.

La conversión a TypeScript no requiere modificar las tablas ni volver a ejecutar la migración si ya fue aplicada.

La API tampoco requiere cambiar las tablas ni volver a ejecutar esa migración. Mantiene el formato JSONB y las revisiones actuales.

## Comprobaciones

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

`build` verifica los tipos del frontend y del servidor antes de generar `dist`. Vite transforma TypeScript, pero la comprobación estática la realiza `tsc`.

Las pruebas ejecutan Express, el adaptador serverless y supabase-js reales, simulando únicamente las respuestas HTTP externas de Supabase. Comprueban autenticación, separación por usuario, validación, paginación, CRUD y conflictos de revisión sin escribir en la base real. Las pruebas de respaldo mantienen la cobertura del formato anterior. Las políticas RLS y el trigger del proyecto desplegado requieren además verificación contra ese entorno; el simulador no sustituye esa comprobación.

## Organización

- `src/App.tsx`: panel, formularios y operaciones de gestión.
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
- `tests/`: pruebas de sincronización y compatibilidad de respaldos.

## Sincronización y recuperación

Una modificación o eliminación debe coincidir con la revisión leída. Ante un conflicto o fallo de guardado, la aplicación muestra un aviso y detiene nuevas escrituras. Descargar un respaldo de los cambios locales antes de recargar y comparar con los datos del servidor antes de restaurarlo.

Las operaciones sobre varios registros no forman una sola transacción: algunos cambios pueden haberse guardado antes de un conflicto. Tras publicar una versión nueva, actualizar las pestañas abiertas en todos los dispositivos. Un cliente anterior sin control de revisión no obtiene esa protección.
