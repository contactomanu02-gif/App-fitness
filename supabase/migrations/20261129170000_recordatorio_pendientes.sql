-- Recordatorio a la tarde: al alumno que tiene sesión hoy y todavía no la marcó le llega un aviso al celular.
-- El entrenador elige la hora (Argentina) en "Mi cuenta"; null = apagado. Por defecto 19 h.
alter table public.organizations
  add column pending_reminder_hour smallint default 19 check (pending_reminder_hour is null or pending_reminder_hour between 0 and 23),
  add column pending_reminder_sent_on date;

-- Cada hora (minuto 5) mira si algún espacio tiene el recordatorio a esta hora y todavía no se mandó hoy.
-- Solo en ese caso le pide a la app que mande los avisos (así no hay llamadas de más).
create or replace function public.trigger_pending_push() returns void
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_url text; v_token text;
  v_now timestamp := now() at time zone 'America/Argentina/Buenos_Aires';
begin
  if not exists (
    select 1 from public.organizations
    where pending_reminder_hour = extract(hour from v_now)
      and (pending_reminder_sent_on is null or pending_reminder_sent_on < v_now::date)
  ) then return; end if;
  select value into v_url from public.app_secrets where key = 'site_url';
  select value into v_token from public.app_secrets where key = 'daily_token';
  if v_url is null or v_token is null then return; end if;
  perform net.http_post(
    url := v_url || '/api/avisos/pendientes',
    headers := jsonb_build_object('Authorization', 'Bearer ' || v_token, 'Content-Type', 'application/json'),
    body := '{}'::jsonb,
    timeout_milliseconds := 20000
  );
end $$;
revoke all on function public.trigger_pending_push() from public, anon, authenticated;

select cron.schedule('recordatorio-pendientes', '5 * * * *', 'select public.trigger_pending_push()');
