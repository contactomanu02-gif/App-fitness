-- =====================================================================
-- Asignación y calendario: cada sesión asignada a un alumno es una copia
-- propia (editarla no toca la plantilla) con una fecha en el calendario.
-- =====================================================================

-- Las copias asignadas quedan marcadas con su alumno (no aparecen como plantillas).
alter table public.workouts add column athlete_id uuid references public.athletes(id) on delete cascade;
create index workouts_athlete_idx on public.workouts(athlete_id);

create table public.scheduled_workouts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  athlete_id uuid not null references public.athletes(id) on delete cascade,
  workout_id uuid not null unique references public.workouts(id) on delete cascade,
  program_id uuid references public.programs(id) on delete cascade,
  date date not null,
  status text not null default 'planned' check (status in ('planned', 'done', 'partial', 'skipped')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index scheduled_athlete_date_idx on public.scheduled_workouts(athlete_id, date);
create index scheduled_org_date_idx on public.scheduled_workouts(org_id, date);
create trigger scheduled_workouts_updated_at before update on public.scheduled_workouts
  for each row execute function public.set_updated_at();

create table public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  athlete_id uuid not null references public.athletes(id) on delete cascade,
  kind text not null check (kind in ('torneo', 'viaje', 'descanso', 'otro')),
  title text not null check (char_length(title) between 1 and 120),
  start_date date not null,
  end_date date not null,
  location text check (location is null or char_length(location) <= 120),
  notes text check (notes is null or char_length(notes) <= 1000),
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  check (end_date >= start_date and end_date - start_date <= 60)
);
create index calendar_events_athlete_idx on public.calendar_events(athlete_id, start_date);

-- ---------- coherencia ----------
create or replace function public.check_schedule_org() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.athlete_org(new.athlete_id) is distinct from new.org_id then raise exception 'org_mismatch'; end if;
  if tg_table_name = 'scheduled_workouts' then
    if not exists (select 1 from public.workouts w where w.id = new.workout_id and w.org_id = new.org_id and w.athlete_id = new.athlete_id) then
      raise exception 'workout_mismatch';
    end if;
  end if;
  return new;
end $$;
create trigger scheduled_same_org before insert or update on public.scheduled_workouts for each row execute function public.check_schedule_org();
create trigger events_same_org before insert or update on public.calendar_events for each row execute function public.check_schedule_org();

-- Fecha de una sesión de planificación: la semana 1 empieza el día de inicio y
-- cada sesión cae en su día de la semana (lunes = 1) dentro de esa semana corrida.
create or replace function public.schedule_date(p_start date, p_week int, p_day int)
returns date language sql immutable as $$
  select p_start + (p_week - 1) * 7 + ((p_day - extract(isodow from p_start)::int + 7) % 7)
$$;

-- Semana absoluta de una sesión dentro de su planificación (sumando bloques anteriores).
create or replace function public.workout_abs_week(p_block uuid, p_week int)
returns int language sql stable security definer set search_path = public as $$
  select coalesce(sum(o.weeks), 0)::int + p_week
  from public.program_blocks b
  left join public.program_blocks o on o.program_id = b.program_id
    and (o.sort_order < b.sort_order or (o.sort_order = b.sort_order and o.created_at < b.created_at))
  where b.id = p_block
$$;

-- Las sesiones de una planificación asignada heredan el alumno y se agendan solas
-- cuando se crean o cambian de día (copiar semana, mover, agregar…).
create or replace function public.workouts_set_athlete() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.program_id is not null then
    select athlete_id into new.athlete_id from public.programs where id = new.program_id;
  end if;
  return new;
end $$;
create trigger workouts_set_athlete before insert or update of program_id on public.workouts
  for each row execute function public.workouts_set_athlete();

create or replace function public.workouts_autoschedule() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_p public.programs;
begin
  if new.program_id is null or new.block_id is null or new.athlete_id is null then return new; end if;
  if tg_op = 'UPDATE' and new.block_id is not distinct from old.block_id
     and new.week_index is not distinct from old.week_index and new.day_index is not distinct from old.day_index then
    return new;
  end if;
  select * into v_p from public.programs where id = new.program_id;
  if v_p.start_date is null then return new; end if;
  insert into public.scheduled_workouts (org_id, athlete_id, workout_id, program_id, date)
  values (new.org_id, new.athlete_id, new.id, new.program_id,
          public.schedule_date(v_p.start_date, public.workout_abs_week(new.block_id, new.week_index), new.day_index))
  on conflict (workout_id) do update set date = excluded.date;
  return new;
end $$;
create trigger workouts_autoschedule after insert or update of block_id, week_index, day_index on public.workouts
  for each row execute function public.workouts_autoschedule();

-- (Re)agenda todas las sesiones de una planificación asignada desde su fecha de inicio.
create or replace function public.schedule_program(p_program uuid)
returns int language plpgsql security invoker set search_path = public as $$
declare v_p public.programs; v_n int;
begin
  select * into v_p from public.programs where id = p_program;
  if not found or not public.is_org_staff(v_p.org_id) then raise exception 'forbidden'; end if;
  if v_p.athlete_id is null or v_p.start_date is null then raise exception 'not_assigned'; end if;
  insert into public.scheduled_workouts (org_id, athlete_id, workout_id, program_id, date)
  select w.org_id, v_p.athlete_id, w.id, w.program_id,
         public.schedule_date(v_p.start_date, public.workout_abs_week(w.block_id, w.week_index), w.day_index)
  from public.workouts w where w.program_id = p_program and w.block_id is not null
  on conflict (workout_id) do update set date = excluded.date;
  get diagnostics v_n = row_count;
  return v_n;
end $$;

-- Asigna una planificación a varios alumnos: cada uno recibe su copia activa y agendada.
create or replace function public.assign_program(p_program uuid, p_athletes uuid[], p_start date)
returns int language plpgsql security invoker set search_path = public as $$
declare v_src public.programs; v_a uuid; v_new uuid; v_n int := 0;
begin
  select * into v_src from public.programs where id = p_program;
  if not found or not public.is_org_staff(v_src.org_id) then raise exception 'forbidden'; end if;
  if p_start is null then raise exception 'start_required'; end if;
  foreach v_a in array p_athletes loop
    if public.athlete_org(v_a) is distinct from v_src.org_id then raise exception 'org_mismatch'; end if;
    v_new := public.copy_program(p_program, v_a);
    update public.programs set status = 'active', start_date = p_start where id = v_new;
    perform public.schedule_program(v_new);
    v_n := v_n + 1;
  end loop;
  return v_n;
end $$;

-- Asigna una sesión suelta: a cada alumno, en los días de semana elegidos, durante N semanas.
create or replace function public.assign_workout(p_workout uuid, p_athletes uuid[], p_start date, p_weekdays smallint[], p_weeks smallint)
returns int language plpgsql security invoker set search_path = public as $$
declare v_src public.workouts; v_a uuid; v_w int; v_d smallint; v_new uuid; v_date date; v_n int := 0;
begin
  select * into v_src from public.workouts where id = p_workout;
  if not found or not public.is_org_staff(v_src.org_id) then raise exception 'forbidden'; end if;
  if p_start is null or coalesce(array_length(p_weekdays, 1), 0) = 0 or p_weeks < 1 or p_weeks > 52 then raise exception 'invalid'; end if;
  foreach v_a in array p_athletes loop
    if public.athlete_org(v_a) is distinct from v_src.org_id then raise exception 'org_mismatch'; end if;
    for v_w in 1..p_weeks loop
      foreach v_d in array p_weekdays loop
        v_date := public.schedule_date(p_start, v_w, v_d);
        v_new := public.copy_workout(p_workout, null, null, null, null);
        update public.workouts set athlete_id = v_a where id = v_new;
        insert into public.scheduled_workouts (org_id, athlete_id, workout_id, date) values (v_src.org_id, v_a, v_new, v_date);
        v_n := v_n + 1;
      end loop;
    end loop;
  end loop;
  return v_n;
end $$;

revoke execute on function public.schedule_program(uuid) from anon, public;
revoke execute on function public.assign_program(uuid, uuid[], date) from anon, public;
revoke execute on function public.assign_workout(uuid, uuid[], date, smallint[], smallint) from anon, public;
grant execute on function public.schedule_program(uuid) to authenticated;
grant execute on function public.assign_program(uuid, uuid[], date) to authenticated;
grant execute on function public.assign_workout(uuid, uuid[], date, smallint[], smallint) to authenticated;

-- ---------- RLS ----------
alter table public.scheduled_workouts enable row level security;
alter table public.calendar_events enable row level security;

-- ¿El alumno actual puede ver esta sesión agendada? (suelta, o de una planificación activa)
create or replace function public.is_visible_schedule(p_athlete uuid, p_program uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_self_athlete(p_athlete)
     and (p_program is null or exists (select 1 from public.programs p where p.id = p_program and p.status = 'active'))
$$;

create policy scheduled_staff on public.scheduled_workouts for all to authenticated
  using (public.is_org_staff(org_id)) with check (public.is_org_staff(org_id));
create policy scheduled_athlete_read on public.scheduled_workouts for select to authenticated
  using (public.is_visible_schedule(athlete_id, program_id));

-- El alumno ve las sesiones sueltas que tiene agendadas (las de planificación ya se ven por la planificación activa).
create or replace function public.is_my_scheduled_workout(p_workout uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.scheduled_workouts s where s.workout_id = p_workout and public.is_visible_schedule(s.athlete_id, s.program_id))
$$;
create policy workouts_athlete_scheduled on public.workouts for select to authenticated
  using (athlete_id is not null and public.is_my_scheduled_workout(id));
create policy items_athlete_scheduled on public.workout_items for select to authenticated
  using (public.is_my_scheduled_workout(workout_id));

create policy events_select on public.calendar_events for select to authenticated
  using (public.is_org_staff(org_id) or public.is_self_athlete(athlete_id));
create policy events_staff_write on public.calendar_events for all to authenticated
  using (public.is_org_staff(org_id)) with check (public.is_org_staff(org_id));
-- El alumno carga y edita sus propios eventos (torneos, viajes…), no los del entrenador.
create policy events_athlete_insert on public.calendar_events for insert to authenticated
  with check (public.is_self_athlete(athlete_id) and created_by = auth.uid());
create policy events_athlete_update on public.calendar_events for update to authenticated
  using (public.is_self_athlete(athlete_id) and created_by = auth.uid())
  with check (public.is_self_athlete(athlete_id) and created_by = auth.uid());
create policy events_athlete_delete on public.calendar_events for delete to authenticated
  using (public.is_self_athlete(athlete_id) and created_by = auth.uid());
