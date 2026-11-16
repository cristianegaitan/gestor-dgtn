-- Instalación NUEVA de Gestor DGTN en un proyecto Supabase vacío.
-- Se ubica antes de la migración de revisiones para poder recorrer el historial.
-- Si ya existe cualquiera de las tablas, se detiene sin cambiarla.
begin;

do $$
begin
  if to_regclass('public.trabajos') is not null
    or to_regclass('public.egresos') is not null then
    raise exception 'El esquema inicial es solo para instalaciones nuevas. Las tablas existentes requieren una revisión previa.';
  end if;
end;
$$;

create table public.trabajos (
  usuario_id uuid not null references auth.users (id) on delete cascade,
  id bigint not null,
  datos jsonb not null,
  primary key (usuario_id, id),
  constraint trabajos_id_valido check (id > 0 and id <= 9007199254740991),
  constraint trabajos_datos_coherentes check (
    jsonb_typeof(datos) = 'object'
    and datos @> jsonb_build_object('id', id)
  )
);

create table public.egresos (
  usuario_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  datos jsonb not null,
  orden bigint not null default 0,
  primary key (usuario_id, id),
  constraint egresos_id_valido check (length(id) between 1 and 200),
  constraint egresos_orden_valido check (orden >= 0 and orden <= 9007199254740991),
  constraint egresos_datos_coherentes check (
    jsonb_typeof(datos) = 'object'
    and datos @> jsonb_build_object('id', id)
  )
);

-- Las claves primarias ya indexan usuario_id primero.
-- Este índice también permite recorrer los egresos en el orden de la interfaz.
create index egresos_usuario_orden_id on public.egresos (usuario_id, orden, id);

alter table public.trabajos enable row level security;
alter table public.egresos enable row level security;

-- Anular los permisos por defecto de Supabase sobre estas dos tablas nuevas.
-- No se concede TRUNCATE: esa operación no está protegida por RLS.
revoke all on public.trabajos, public.egresos from public, anon, authenticated;
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.trabajos, public.egresos to authenticated;

create policy trabajos_lectura_propia on public.trabajos
  for select to authenticated
  using ((select auth.uid()) = usuario_id);

create policy trabajos_creacion_propia on public.trabajos
  for insert to authenticated
  with check ((select auth.uid()) = usuario_id);

create policy trabajos_edicion_propia on public.trabajos
  for update to authenticated
  using ((select auth.uid()) = usuario_id)
  with check ((select auth.uid()) = usuario_id);

create policy trabajos_borrado_propio on public.trabajos
  for delete to authenticated
  using ((select auth.uid()) = usuario_id);

create policy egresos_lectura_propia on public.egresos
  for select to authenticated
  using ((select auth.uid()) = usuario_id);

create policy egresos_creacion_propia on public.egresos
  for insert to authenticated
  with check ((select auth.uid()) = usuario_id);

create policy egresos_edicion_propia on public.egresos
  for update to authenticated
  using ((select auth.uid()) = usuario_id)
  with check ((select auth.uid()) = usuario_id);

create policy egresos_borrado_propio on public.egresos
  for delete to authenticated
  using ((select auth.uid()) = usuario_id);

comment on table public.trabajos is
  'Trabajos de cada usuario; cuentas y pagos se conservan dentro de datos JSONB.';
comment on table public.egresos is
  'Egresos de cada usuario. trabajoId es una referencia histórica dentro del JSONB, sin clave foránea.';

commit;
