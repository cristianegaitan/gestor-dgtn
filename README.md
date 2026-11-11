# Gestor DGTN

Aplicación de gestión para trabajos de fotografía y video. Permite administrar eventos, cuentas de cobro, pagos, egresos y entregas desde el navegador.

## Tecnologías

React, TypeScript en modo estricto, Vite y Supabase (autenticación y PostgreSQL). La interfaz se adapta a computadoras y celulares.

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

## Base de datos

El proyecto Supabase debe tener las tablas `trabajos` y `egresos`, con sus políticas de acceso por usuario configuradas. Cada tabla guarda el contenido en `datos` (JSONB), junto con `id` y `usuario_id`; `egresos` también utiliza `orden`.

La migración `supabase/migrations/20261013_registro_revisiones.sql` agrega la columna `revision` y los triggers para incrementarla al actualizar. Esa migración presupone las tablas existentes; no crea la base de datos completa desde cero.

La conversión a TypeScript no requiere modificar las tablas ni volver a ejecutar la migración si ya fue aplicada.

## Comprobaciones

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

`build` verifica los tipos antes de generar `dist`. Vite transforma TypeScript, pero la comprobación estática la realiza `tsc`. Las pruebas de sincronización usan un cliente simulado y no escriben en la base de datos real. Las pruebas de respaldo comprueban compatibilidad con formatos anteriores y rechazo de datos inválidos.

## Organización

- `src/App.tsx`: panel, formularios y operaciones de gestión.
- `src/Acceso.tsx`: inicio y cierre de sesión.
- `src/types.ts`: contratos de trabajos, cuentas, pagos, egresos y respaldos.
- `src/lib/validaciones.ts`: comprobación de datos externos y respaldos.
- `src/lib/useDatosRemotos.ts`: carga, cola de guardado y estado de sincronización.
- `src/lib/datosRemotos.ts`: operaciones con Supabase y control de revisiones.
- `src/lib/aplicarCambios.ts`: diferencias entre colecciones y persistencia.
- `tests/`: pruebas de sincronización y compatibilidad de respaldos.

## Sincronización y recuperación

Una modificación o eliminación debe coincidir con la revisión leída. Ante un conflicto o fallo de guardado, la aplicación muestra un aviso y detiene nuevas escrituras. Descargar un respaldo de los cambios locales antes de recargar y comparar con los datos del servidor antes de restaurarlo.

Las operaciones sobre varios registros no forman una sola transacción: algunos cambios pueden haberse guardado antes de un conflicto. Tras publicar una versión nueva, actualizar las pestañas abiertas en todos los dispositivos. Un cliente anterior sin control de revisión no obtiene esa protección.
