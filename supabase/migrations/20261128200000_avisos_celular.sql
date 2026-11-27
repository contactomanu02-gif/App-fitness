-- Notificaciones en el celular (push web).
-- 1) push_subscriptions: un registro por celular/navegador que activó los avisos.
-- 2) app_secrets: claves internas de la app (VAPID y la clave del aviso diario). Sin políticas:
--    solo el servidor (service role) puede leerlas. Se generan acá o en el servidor, nunca están en el código.
-- 3) Un trabajo diario (pg_cron + pg_net) le pide a la app que mande "Hoy tenés sesión" a las 8 de Argentina.

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique check (char_length(endpoint) <= 1000),
  p256dh text not null check (char_length(p256dh) <= 200),
  auth text not null check (char_length(auth) <= 100),
  user_agent text check (user_agent is null or char_length(user_agent) <= 300),
  created_at timestamptz not null default now()
);
create index push_subscriptions_user_idx on public.push_subscriptions(user_id);
alter table public.push_subscriptions enable row level security;
create policy push_own_select on public.push_subscriptions for select to authenticated using (user_id = auth.uid());
create policy push_own_delete on public.push_subscriptions for delete to authenticated using (user_id = auth.uid());
-- El alta pasa por save_push_subscription (un celular puede cambiar de usuario si se cierra sesión).

create or replace function public.save_push_subscription(p_endpoint text, p_p256dh text, p_auth text, p_ua text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'forbidden'; end if;
  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
  values (auth.uid(), p_endpoint, p_p256dh, p_auth, left(p_ua, 300))
  on conflict (endpoint) do update
    set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth, user_agent = excluded.user_agent;
end $$;
revoke all on function public.save_push_subscription(text, text, text, text) from public, anon;
grant execute on function public.save_push_subscription(text, text, text, text) to authenticated;

create table public.app_secrets (
  key text primary key,
  value text not null,
  created_at timestamptz not null default now()
);
alter table public.app_secrets enable row level security;
revoke all on public.app_secrets from anon, authenticated;

create extension if not exists pgcrypto with schema extensions;
insert into public.app_secrets (key, value)
values ('daily_token', encode(extensions.gen_random_bytes(32), 'hex')),
       ('site_url', 'https://app.fitness-approach-app.workers.dev')
on conflict (key) do nothing;

-- Pide a la app que mande los avisos del día.
create or replace function public.trigger_daily_push() returns void
language plpgsql security definer set search_path = public, extensions as $$
declare v_url text; v_token text;
begin
  select value into v_url from public.app_secrets where key = 'site_url';
  select value into v_token from public.app_secrets where key = 'daily_token';
  if v_url is null or v_token is null then return; end if;
  perform net.http_post(
    url := v_url || '/api/avisos/diario',
    headers := jsonb_build_object('Authorization', 'Bearer ' || v_token, 'Content-Type', 'application/json'),
    body := '{}'::jsonb,
    timeout_milliseconds := 20000
  );
end $$;
revoke all on function public.trigger_daily_push() from public, anon, authenticated;

create extension if not exists pg_net;
create extension if not exists pg_cron;

-- 11:00 UTC = 8:00 en Argentina.
select cron.schedule('avisos-diarios', '0 11 * * *', 'select public.trigger_daily_push()');
