-- Ejecutar en el SQL Editor de Supabase antes de publicar el cliente actualizado.
-- Los registros existentes empiezan en la revisión 0.
begin;

alter table public.trabajos
  add column if not exists revision bigint not null default 0;

alter table public.egresos
  add column if not exists revision bigint not null default 0;

-- El servidor incrementa la revisión incluso si escribe una pestaña antigua.
create or replace function public.incrementar_revision_registro()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.revision := old.revision + 1;
  return new;
end;
$$;

drop trigger if exists revision_trabajos on public.trabajos;
create trigger revision_trabajos
  before update on public.trabajos
  for each row execute function public.incrementar_revision_registro();

drop trigger if exists revision_egresos on public.egresos;
create trigger revision_egresos
  before update on public.egresos
  for each row execute function public.incrementar_revision_registro();

commit;
