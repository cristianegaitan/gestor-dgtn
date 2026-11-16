-- Diagnóstico de solo lectura. Consulta metadatos, no registros del gestor.
-- Permite comparar una instalación existente con lo definido en el repositorio.
select jsonb_build_object(
  'tablas', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'nombre', c.relname, 'rls', c.relrowsecurity
    ) order by c.relname), '[]'::jsonb)
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname in ('trabajos', 'egresos') and c.relkind = 'r'
  ),
  'columnas', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'tabla', table_name, 'columna', column_name, 'tipo', data_type,
      'admite_null', is_nullable, 'valor_inicial', column_default
    ) order by table_name, ordinal_position), '[]'::jsonb)
    from information_schema.columns
    where table_schema = 'public' and table_name in ('trabajos', 'egresos')
  ),
  'restricciones', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'tabla', c.relname, 'nombre', con.conname, 'definicion', pg_get_constraintdef(con.oid)
    ) order by c.relname, con.conname), '[]'::jsonb)
    from pg_constraint con join pg_class c on c.oid = con.conrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname in ('trabajos', 'egresos')
  ),
  'indices', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'tabla', tablename, 'nombre', indexname, 'definicion', indexdef
    ) order by tablename, indexname), '[]'::jsonb)
    from pg_indexes where schemaname = 'public' and tablename in ('trabajos', 'egresos')
  ),
  'politicas', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'tabla', tablename, 'nombre', policyname, 'operacion', cmd,
      'roles', roles, 'using', qual, 'with_check', with_check
    ) order by tablename, policyname), '[]'::jsonb)
    from pg_policies where schemaname = 'public' and tablename in ('trabajos', 'egresos')
  ),
  'permisos', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'tabla', table_name, 'rol', grantee, 'permiso', privilege_type
    ) order by table_name, grantee, privilege_type), '[]'::jsonb)
    from information_schema.table_privileges
    where table_schema = 'public' and table_name in ('trabajos', 'egresos')
  ),
  'triggers', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'tabla', c.relname, 'nombre', t.tgname, 'definicion', pg_get_triggerdef(t.oid)
    ) order by c.relname, t.tgname), '[]'::jsonb)
    from pg_trigger t join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname in ('trabajos', 'egresos') and not t.tgisinternal
  )
) as esquema_gestor;
