-- Para el registro del alumno: saber si un email ya tiene cuenta antes de pedirle todos los datos.
-- Solo lo puede usar el servidor (service_role), nunca el navegador.
create or replace function public.email_has_account(p_email text)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select exists (select 1 from auth.users where lower(email) = lower(trim(p_email)));
$$;

revoke all on function public.email_has_account(text) from public, anon, authenticated;
grant execute on function public.email_has_account(text) to service_role;
