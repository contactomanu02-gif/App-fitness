-- Modo torneo: alrededor de cada competencia el entrenador aprueba
--   * una previa corta de fuerza y potencia 2 o 3 días antes,
--   * una activación de 10 a 15 minutos cada día de torneo, antes de salir a jugar,
--   * una recuperación suave el día después,
--   * y los consejos del día (hidratación, comida, sueño).
-- Nada lo ve el alumno hasta que el entrenador lo aprueba: la fila se crea recién al aprobar
-- y las sesiones se agendan en ese momento.
create table public.competition_kits (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  athlete_id uuid not null references public.athletes(id) on delete cascade,
  event_id uuid not null unique references public.calendar_events(id) on delete cascade,
  pre_days smallint check (pre_days is null or pre_days between 2 and 3),
  pre_workout_id uuid references public.workouts(id) on delete set null,
  day_workout_id uuid references public.workouts(id) on delete set null,
  post_workout_id uuid references public.workouts(id) on delete set null,
  tips text[] not null default '{}' check (cardinality(tips) <= 8),
  -- Copias agendadas para el alumno (para poder rehacerlo sin duplicar).
  workout_ids uuid[] not null default '{}',
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index competition_kits_athlete_idx on public.competition_kits(athlete_id);
alter table public.competition_kits enable row level security;
create policy competition_kits_staff on public.competition_kits for all to authenticated
  using (public.is_org_staff(org_id)) with check (public.is_org_staff(org_id) and org_id = public.athlete_org(athlete_id));
create policy competition_kits_self_read on public.competition_kits for select to authenticated using (public.is_self_athlete(athlete_id));

-- El entrenador aprueba (o rehace) el modo torneo de una competencia.
-- p_pre / p_day / p_post son sesiones sueltas de la biblioteca (null = no va).
create or replace function public.approve_competition_kit(
  p_event uuid, p_pre_days smallint, p_pre uuid, p_day uuid, p_post uuid, p_tips text[]
) returns int language plpgsql security invoker set search_path = public as $$
declare
  e public.calendar_events;
  v_old uuid[];
  v_ids uuid[] := '{}';
  v_tips text[];
  v_slot record;
  v_new uuid;
begin
  select * into e from public.calendar_events where id = p_event and kind = 'torneo';
  if not found or e.athlete_id is null or not public.is_org_staff(e.org_id) then raise exception 'forbidden'; end if;
  if e.end_date + 1 < (now() at time zone 'America/Argentina/Buenos_Aires')::date then raise exception 'past'; end if;
  if p_pre_days is not null and p_pre_days not between 2 and 3 then raise exception 'invalid'; end if;
  if p_pre is not null and p_pre_days is null then raise exception 'invalid'; end if;
  if exists (
    select 1 from unnest(array[p_pre, p_day, p_post]) t(id)
    where t.id is not null and not exists (
      select 1 from public.workouts w where w.id = t.id and w.org_id = e.org_id and w.program_id is null and w.athlete_id is null)
  ) then raise exception 'invalid_template'; end if;
  select coalesce(array_agg(left(trim(x), 200) order by n), '{}') into v_tips
  from unnest(coalesce(p_tips, '{}')) with ordinality as t(x, n) where nullif(trim(x), '') is not null;
  if cardinality(v_tips) > 8 then raise exception 'invalid'; end if;

  -- Si ya estaba aprobado, se sacan las sesiones que había agendado y siguen pendientes.
  select workout_ids into v_old from public.competition_kits where event_id = p_event for update;
  if v_old is not null then
    delete from public.workouts w using public.scheduled_workouts s
    where s.workout_id = w.id and w.id = any(v_old) and s.status = 'planned';
  end if;

  for v_slot in
    select d::date as date, p_pre as tpl from (select e.start_date - p_pre_days::int as d) x where p_pre is not null
    union all
    select d::date, p_day from generate_series(e.start_date, least(e.end_date, e.start_date + 6), interval '1 day') d where p_day is not null
    union all
    select e.end_date + 1, p_post where p_post is not null
    order by 1
  loop
    if v_slot.date < (now() at time zone 'America/Argentina/Buenos_Aires')::date then continue; end if;
    -- Si ese día ya entrenó, no se toca.
    if exists (select 1 from public.scheduled_workouts where athlete_id = e.athlete_id and date = v_slot.date and status <> 'planned') then
      continue;
    end if;
    -- Lo que tenía pendiente ese día se cambia por la sesión del modo torneo.
    delete from public.workouts w using public.scheduled_workouts s
    where s.workout_id = w.id and s.athlete_id = e.athlete_id and s.date = v_slot.date and s.status = 'planned';
    v_new := public.copy_workout(v_slot.tpl, null, null, null, null);
    update public.workouts set athlete_id = e.athlete_id where id = v_new;
    insert into public.scheduled_workouts (org_id, athlete_id, workout_id, date) values (e.org_id, e.athlete_id, v_new, v_slot.date);
    v_ids := v_ids || v_new;
  end loop;

  insert into public.competition_kits (org_id, athlete_id, event_id, pre_days, pre_workout_id, day_workout_id, post_workout_id, tips, workout_ids, approved_by, approved_at)
  values (e.org_id, e.athlete_id, p_event, case when p_pre is null then null else p_pre_days end, p_pre, p_day, p_post, v_tips, v_ids, auth.uid(), now())
  on conflict (event_id) do update set
    pre_days = excluded.pre_days, pre_workout_id = excluded.pre_workout_id, day_workout_id = excluded.day_workout_id,
    post_workout_id = excluded.post_workout_id, tips = excluded.tips, workout_ids = excluded.workout_ids,
    approved_by = excluded.approved_by, approved_at = excluded.approved_at;
  return cardinality(v_ids);
end $$;
revoke execute on function public.approve_competition_kit(uuid, smallint, uuid, uuid, uuid, text[]) from public, anon;
grant execute on function public.approve_competition_kit(uuid, smallint, uuid, uuid, uuid, text[]) to authenticated;

-- Sacar el modo torneo: se borra lo pendiente que había agendado y los consejos.
create or replace function public.remove_competition_kit(p_event uuid)
returns void language plpgsql security invoker set search_path = public as $$
declare v_old uuid[]; v_org uuid;
begin
  select workout_ids, org_id into v_old, v_org from public.competition_kits where event_id = p_event;
  if v_org is null then return; end if;
  if not public.is_org_staff(v_org) then raise exception 'forbidden'; end if;
  delete from public.workouts w using public.scheduled_workouts s
  where s.workout_id = w.id and w.id = any(v_old) and s.status = 'planned';
  delete from public.competition_kits where event_id = p_event;
end $$;
revoke execute on function public.remove_competition_kit(uuid) from public, anon;
grant execute on function public.remove_competition_kit(uuid) to authenticated;
