# Base de datos de Gestor DGTN

Este directorio contiene una instalación reproducible compatible con la API actual. Las migraciones crean las tablas de la aplicación dentro de un proyecto Supabase nuevo. Supabase ya debe proporcionar `auth.users`, `auth.uid()` y los roles `anon` y `authenticated`.

## Historial e instalación nueva

Ejecutar los archivos completos, en este orden, en el SQL Editor de un **proyecto Supabase nuevo y vacío**:

| Orden | Archivo | Resultado |
| --- | --- | --- |
| 1 | `migrations/20261012_esquema_inicial.sql` | Tablas, claves, restricciones, índice, permisos y políticas RLS |
| 2 | `migrations/20261013_registro_revisiones.sql` | Columna `revision` y triggers de incremento |

La primera migración se incorporó al repositorio después de la de revisiones, pero se ubica antes en el orden de instalación. No es una migración pendiente para la base que ya está funcionando. Si encuentra cualquiera de las dos tablas existentes, se detiene y revierte la transacción en lugar de reemplazarla.

Tras ejecutar las migraciones:

1. Crear una cuenta en Supabase Auth para iniciar sesión; el gestor no incluye registro público de usuarios.
2. Completar la URL y la clave publicable de ese proyecto en `.env.local`, según el README principal.
3. Ejecutar `npm run dev`, ingresar y verificar creación, edición y borrado con datos de prueba.
4. Para publicar, configurar también las variables de Netlify para Builds y Functions.

No cargar datos personales ni cuentas de ejemplo en las migraciones. Los respaldos JSON del gestor conservan su formato actual.

## Instalación que ya está en uso

La versión publicada ya tiene tablas y revisiones. Incorporar estos archivos al repositorio no ejecuta SQL en Supabase. Esta entrega no requiere pegar las migraciones otra vez en ese proyecto.

El esquema aquí definido es una referencia probada contra el contrato de la API, no un volcado de la configuración remota. Para comparar una instalación existente, ejecutar `diagnosticos/verificar_esquema.sql`: consulta columnas, claves, índices, permisos, políticas y triggers, sin leer ni modificar registros del gestor.

Antes de adoptar un flujo de migraciones con la CLI sobre un proyecto existente, hay que reconciliar su esquema y su historial remoto con estos archivos. No ejecutar un `db push` ni marcar migraciones como aplicadas para resolver diferencias sin esa comparación. El archivo inicial que falta en el historial remoto no implica que deba ejecutarse sobre tablas que ya contienen datos.

## Tablas y decisiones del modelo

| Tabla | Columnas | Clave primaria |
| --- | --- | --- |
| `trabajos` | `usuario_id uuid`, `id bigint`, `datos jsonb`, `revision bigint` | `(usuario_id, id)` |
| `egresos` | `usuario_id uuid`, `id text`, `datos jsonb`, `orden bigint`, `revision bigint` | `(usuario_id, id)` |

- `usuario_id` referencia `auth.users(id)`. Al eliminar una cuenta Auth se eliminan sus trabajos y egresos. El cierre de sesión no elimina la cuenta ni sus datos.
- La clave compuesta permite repetir un ID entre personas diferentes, pero no dentro de la misma cuenta. La API siempre identifica el registro junto con el usuario autenticado.
- Las restricciones exigen que `datos` sea un objeto JSON y que su ID coincida con la columna `id`. Los IDs de trabajo y el orden se mantienen dentro del rango de enteros seguros de JavaScript.
- La clave primaria ya indexa `usuario_id`. El índice adicional `(usuario_id, orden, id)` permite ordenar los egresos de una cuenta.
- Cuentas de cobro y pagos siguen dentro del JSONB de cada trabajo. Su validación detallada se realiza en la API; las restricciones SQL no reemplazan esa validación.
- `trabajoId` en un egreso es una referencia histórica dentro del JSONB, sin clave foránea. Al borrar un trabajo, el egreso se conserva y la interfaz muestra «Trabajo eliminado», como en la aplicación actual. No se agregó una restricción que impida ese comportamiento.

La normalización de cuentas y pagos en tablas propias queda para una evolución que necesite consultas y transacciones entre ellos. No forma parte de esta instalación del modelo actual.

## Acceso y revisiones

Las dos tablas tienen RLS habilitado y cuatro políticas cada una: SELECT, INSERT, UPDATE y DELETE para el rol `authenticated`. Todas comparan el dueño con `auth.uid()`. UPDATE comprueba tanto la fila original como su resultado, para impedir transferirla a otra cuenta.

`anon` no recibe acceso a las tablas. `authenticated` solo recibe SELECT, INSERT, UPDATE y DELETE; no TRUNCATE. Una identidad ausente no satisface las políticas aunque se use ese rol. Los superusuarios, el propietario de la tabla y los roles con BYPASSRLS son distintos de un usuario normal; las pruebas cambian efectivamente de rol para no dar una falsa garantía ejecutando todo como administrador.

La revisión empieza en 0. El trigger existente la incrementa en cada UPDATE, incluso si el cliente intenta fijar otro valor. La API compara la revisión leída antes de modificar o eliminar: cero filas afectadas significa conflicto. Esta protección exige que el cliente envíe la revisión; el trigger por sí solo no bloquea una escritura sin condición.

## Pruebas sin un servidor externo

```bash
npm ci
npm run test:db
```

También se ejecutan con `npm test`. No requieren Docker, credenciales ni un proyecto Supabase remoto.

Las pruebas usan PGlite, que ejecuta PostgreSQL en memoria, y aplican los archivos SQL reales del historial. Solo se prepara una versión mínima de los componentes de Auth que normalmente instala Supabase, definida en `tests/fixtures/auth-pruebas.sql`. Ese archivo es exclusivo de las pruebas; no debe ejecutarse en Supabase.

Se comprueban instalación desde cero, CRUD, separación entre usuarios, intentos de suplantación, acceso anónimo, restricciones, revisiones, conservación de datos históricos, borrado de cuentas Auth y rechazo de la instalación inicial sobre tablas existentes.

Estas pruebas verifican SQL y RLS en PostgreSQL embebido. No levantan los servicios Supabase Auth ni PostgREST, ni certifican las políticas que hoy tenga otro proyecto remoto. Las pruebas HTTP de la API cubren esa otra capa con respuestas externas simuladas; la comprobación completa de un proyecto Supabase nuevo termina con el inicio de sesión y operaciones desde el gestor.
