-- =====================================================================
-- Seguimiento: registro de series, cierre de la sesión y alertas al entrenador.
-- =====================================================================

alter table public.scheduled_workouts
  add column started_at timestamptz,
  add column completed_at timestamptz,
  add column duration_min smallint check (duration_min is null or duration_min between 1 and 600),
  add column session_rpe smallint check (session_rpe is null or session_rpe between 1 and 10),
  add column comment text check (comment is null or char_length(comment) <= 1000),
  add column pain boolean not null default false,
  add column pain_area text check (pain_area is null or char_length(pain_area) <= 80),
  add column pain_level smallint check (pain_level is null or pain_level between 1 and 10);

create table public.set_logs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  athlete_id uuid not null references public.athletes(id) on delete cascade,
  scheduled_id uuid not null references public.scheduled_workouts(id) on delete cascade,
  workout_item_id uuid references public.workout_items(id) on delete set null,
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  set_number smallint not null check (set_number between 1 and 50),
  reps smallint check (reps is null or reps between 0 and 1000),
  load_kg numeric(6,2) check (load_kg is null or load_kg between 0 and 2000),
  done boolean not null default true,
  logged_at timestamptz not null default now(),
  unique (scheduled_id, workout_item_id, set_number)
);
create index set_logs_athlete_ex_idx on public.set_logs(athlete_id, exercise_id, logged_at);

create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  athlete_id uuid not null references public.athletes(id) on delete cascade,
  scheduled_id uuid references public.scheduled_workouts(id) on delete cascade,
  kind text not null check (kind in ('pain', 'skipped', 'rpe_high')),
  message text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index alerts_org_unread_idx on public.alerts(org_id, created_at desc) where read_at is null;

alter table public.set_logs enable row level security;
alter table public.alerts enable row level security;

create policy set_logs_staff_read on public.set_logs for select to authenticated using (public.is_org_staff(org_id));
create policy set_logs_athlete_read on public.set_logs for select to authenticated using (public.is_self_athlete(athlete_id));
create policy alerts_staff on public.alerts for select to authenticated using (public.is_org_staff(org_id));
create policy alerts_staff_update on public.alerts for update to authenticated
  using (public.is_org_staff(org_id)) with check (public.is_org_staff(org_id));
-- Las escrituras del alumno pasan solo por las funciones de abajo.

-- Sesión agendada del alumno actual (o error).
create or replace function public.my_schedule(p_scheduled uuid) returns public.scheduled_workouts
language plpgsql stable security definer set search_path = public as $$
declare v public.scheduled_workouts;
begin
  select * into v from public.scheduled_workouts where id = p_scheduled;
  if not found or not public.is_visible_schedule(v.athlete_id, v.program_id) then raise exception 'forbidden'; end if;
  return v;
end $$;

create or replace function public.start_session(p_scheduled uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v public.scheduled_workouts := public.my_schedule(p_scheduled);
begin
  update public.scheduled_workouts set started_at = coalesce(started_at, now()) where id = v.id;
end $$;

-- Guarda (o actualiza) una serie. p_done = false la desmarca.
create or replace function public.log_set(p_scheduled uuid, p_item uuid, p_set smallint, p_reps smallint, p_load numeric, p_done boolean)
returns void language plpgsql security definer set search_path = public as $$
declare v public.scheduled_workouts := public.my_schedule(p_scheduled); v_ex uuid;
begin
  select exercise_id into v_ex from public.workout_items where id = p_item and workout_id = v.workout_id;
  if v_ex is null then raise exception 'item_mismatch'; end if;
  if not p_done then
    delete from public.set_logs where scheduled_id = v.id and workout_item_id = p_item and set_number = p_set;
    return;
  end if;
  insert into public.set_logs (org_id, athlete_id, scheduled_id, workout_item_id, exercise_id, set_number, reps, load_kg, done)
  values (v.org_id, v.athlete_id, v.id, p_item, v_ex, p_set, p_reps, p_load, true)
  on conflict (scheduled_id, workout_item_id, set_number) do update set reps = excluded.reps, load_kg = excluded.load_kg, logged_at = now();
  update public.scheduled_workouts set started_at = coalesce(started_at, now()) where id = v.id;
end $$;

-- Cierre de la sesión. Genera alertas para el entrenador si hubo dolor, no se hizo o el esfuerzo fue muy alto.
create or replace function public.finish_session(
  p_scheduled uuid, p_status text, p_duration smallint, p_rpe smallint, p_comment text,
  p_pain boolean, p_pain_area text, p_pain_level smallint
) returns void language plpgsql security definer set search_path = public as $$
declare v public.scheduled_workouts := public.my_schedule(p_scheduled); v_name text; v_who text;
begin
  if p_status not in ('done', 'partial', 'skipped') then raise exception 'invalid_status'; end if;
  if p_pain and (p_pain_area is null or trim(p_pain_area) = '') then raise exception 'pain_area_required'; end if;
  update public.scheduled_workouts set
    status = p_status,
    completed_at = now(),
    duration_min = case when p_status = 'skipped' then null else p_duration end,
    session_rpe = case when p_status = 'skipped' then null else p_rpe end,
    comment = nullif(trim(p_comment), ''),
    pain = coalesce(p_pain, false),
    pain_area = case when p_pain then trim(p_pain_area) end,
    pain_level = case when p_pain then p_pain_level end
  where id = v.id;

  delete from public.alerts where scheduled_id = v.id and read_at is null;
  select w.name into v_name from public.workouts w where w.id = v.workout_id;
  select trim(first_name || ' ' || coalesce(last_name, '')) into v_who from public.athletes where id = v.athlete_id;
  if p_pain then
    insert into public.alerts (org_id, athlete_id, scheduled_id, kind, message)
    values (v.org_id, v.athlete_id, v.id, 'pain',
            format('%s reportó dolor en %s (%s/10) en «%s».', v_who, trim(p_pain_area), coalesce(p_pain_level::text, '?'), v_name));
  end if;
  if p_status = 'skipped' then
    insert into public.alerts (org_id, athlete_id, scheduled_id, kind, message)
    values (v.org_id, v.athlete_id, v.id, 'skipped', format('%s no hizo «%s».', v_who, v_name) || coalesce(' Motivo: ' || nullif(trim(p_comment), ''), ''));
  elsif p_rpe >= 9 then
    insert into public.alerts (org_id, athlete_id, scheduled_id, kind, message)
    values (v.org_id, v.athlete_id, v.id, 'rpe_high', format('%s marcó esfuerzo %s/10 en «%s».', v_who, p_rpe, v_name));
  end if;
end $$;

-- Reabrir una sesión cerrada (por si el alumno se equivocó).
create or replace function public.reopen_session(p_scheduled uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v public.scheduled_workouts := public.my_schedule(p_scheduled);
begin
  update public.scheduled_workouts set status = 'planned', completed_at = null where id = v.id;
  delete from public.alerts where scheduled_id = v.id and read_at is null;
end $$;

revoke execute on function public.my_schedule(uuid) from anon, public, authenticated;
revoke execute on function public.start_session(uuid) from anon, public;
revoke execute on function public.log_set(uuid, uuid, smallint, smallint, numeric, boolean) from anon, public;
revoke execute on function public.finish_session(uuid, text, smallint, smallint, text, boolean, text, smallint) from anon, public;
revoke execute on function public.reopen_session(uuid) from anon, public;
grant execute on function public.start_session(uuid) to authenticated;
grant execute on function public.log_set(uuid, uuid, smallint, smallint, numeric, boolean) to authenticated;
grant execute on function public.finish_session(uuid, text, smallint, smallint, text, boolean, text, smallint) to authenticated;
grant execute on function public.reopen_session(uuid) to authenticated;
