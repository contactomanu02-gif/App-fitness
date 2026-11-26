-- Quién cargó cada lesión lo decide la base, no el cliente.
alter table public.injuries alter column created_by set default auth.uid();

create or replace function public.injuries_set_created_by()
returns trigger language plpgsql as $$
begin
  if auth.uid() is not null then new.created_by := auth.uid(); end if;
  return new;
end $$;
create trigger injuries_set_created_by before insert on public.injuries
  for each row execute function public.injuries_set_created_by();
