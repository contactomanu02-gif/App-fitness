-- =====================================================================
-- Rutinas: planificaciones (con bloques, semanas y días), sesiones y
-- ejercicios por sesión. Una planificación sin alumno es una plantilla.
-- =====================================================================

create table public.programs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  athlete_id uuid references public.athletes(id) on delete cascade, -- null = plantilla
  name text not null check (char_length(name) between 1 and 120),
  goal text,
  description text,
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  source text not null default 'manual' check (source in ('manual', 'ai')),
  start_date date,
  source_program_id uuid references public.programs(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index programs_org_idx on public.programs(org_id, status);
create index programs_athlete_idx on public.programs(athlete_id);
create trigger programs_updated_at before update on public.programs
  for each row execute function public.set_updated_at();

create table public.program_blocks (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  goal text,
  weeks smallint not null default 1 check (weeks between 1 and 16),
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index program_blocks_program_idx on public.program_blocks(program_id);

create table public.workouts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  program_id uuid references public.programs(id) on delete cascade, -- null = sesión suelta (plantilla)
  block_id uuid references public.program_blocks(id) on delete cascade,
  week_index smallint check (week_index is null or week_index between 1 and 16),
  day_index smallint check (day_index is null or day_index between 1 and 7),
  name text not null check (char_length(name) between 1 and 120),
  goal text,
  est_duration_min smallint check (est_duration_min is null or est_duration_min between 1 and 600),
  focus text[] not null default '{}',
  notes text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((block_id is null) = (week_index is null) and (block_id is null) = (day_index is null)),
  check (block_id is null or program_id is not null)
);
create index workouts_program_idx on public.workouts(program_id);
create index workouts_block_idx on public.workouts(block_id, week_index, day_index);
create index workouts_org_loose_idx on public.workouts(org_id) where program_id is null;
create trigger workouts_updated_at before update on public.workouts
  for each row execute function public.set_updated_at();

create table public.workout_items (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete restrict,
  sort_order int not null default 0,
  group_label text check (group_label is null or group_label ~ '^[A-Z]$'),
  sets smallint check (sets is null or sets between 1 and 50),
  reps text check (reps is null or char_length(reps) <= 30),
  load text check (load is null or char_length(load) <= 40),
  rest_sec smallint check (rest_sec is null or rest_sec between 0 and 1800),
  tempo text check (tempo is null or char_length(tempo) <= 20),
  rpe numeric(3,1) check (rpe is null or rpe between 1 and 10),
  notes text check (notes is null or char_length(notes) <= 1000)
);
create index workout_items_workout_idx on public.workout_items(workout_id, sort_order);

-- ---------- helpers de pertenencia ----------
create or replace function public.program_org(p uuid) returns uuid
language sql stable security definer set search_path = public as $$ select org_id from public.programs where id = p $$;
create or replace function public.workout_org(p uuid) returns uuid
language sql stable security definer set search_path = public as $$ select org_id from public.workouts where id = p $$;

-- ¿El alumno actual tiene asignada esta planificación?
create or replace function public.is_program_athlete(p uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.programs pr join public.athletes a on a.id = pr.athlete_id
    where pr.id = p and a.user_id = auth.uid() and pr.status = 'active'
  );
$$;

-- ---------- coherencia: los hijos heredan la organización del padre ----------
create or replace function public.check_same_org() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_table_name = 'program_blocks' then
    if public.program_org(new.program_id) is distinct from new.org_id then raise exception 'org_mismatch'; end if;
  elsif tg_table_name = 'workouts' then
    if new.program_id is not null and public.program_org(new.program_id) is distinct from new.org_id then raise exception 'org_mismatch'; end if;
    if new.block_id is not null and not exists (select 1 from public.program_blocks b where b.id = new.block_id and b.program_id = new.program_id) then
      raise exception 'block_mismatch';
    end if;
  elsif tg_table_name = 'workout_items' then
    if public.workout_org(new.workout_id) is distinct from new.org_id then raise exception 'org_mismatch'; end if;
    if not exists (select 1 from public.exercises e where e.id = new.exercise_id and (e.org_id is null or e.org_id = new.org_id)) then
      raise exception 'exercise_not_available';
    end if;
  elsif tg_table_name = 'programs' then
    if new.athlete_id is not null and public.athlete_org(new.athlete_id) is distinct from new.org_id then raise exception 'org_mismatch'; end if;
  end if;
  return new;
end $$;
create trigger programs_same_org before insert or update on public.programs for each row execute function public.check_same_org();
create trigger program_blocks_same_org before insert or update on public.program_blocks for each row execute function public.check_same_org();
create trigger workouts_same_org before insert or update on public.workouts for each row execute function public.check_same_org();
create trigger workout_items_same_org before insert or update on public.workout_items for each row execute function public.check_same_org();

-- ---------- RLS ----------
alter table public.programs enable row level security;
alter table public.program_blocks enable row level security;
alter table public.workouts enable row level security;
alter table public.workout_items enable row level security;

create policy programs_staff on public.programs for all to authenticated
  using (public.is_org_staff(org_id)) with check (public.is_org_staff(org_id));
create policy programs_athlete_read on public.programs for select to authenticated
  using (public.is_program_athlete(id));

create policy blocks_staff on public.program_blocks for all to authenticated
  using (public.is_org_staff(org_id)) with check (public.is_org_staff(org_id));
create policy blocks_athlete_read on public.program_blocks for select to authenticated
  using (public.is_program_athlete(program_id));

create policy workouts_staff on public.workouts for all to authenticated
  using (public.is_org_staff(org_id)) with check (public.is_org_staff(org_id));
create policy workouts_athlete_read on public.workouts for select to authenticated
  using (program_id is not null and public.is_program_athlete(program_id));

create policy items_staff on public.workout_items for all to authenticated
  using (public.is_org_staff(org_id)) with check (public.is_org_staff(org_id));
create policy items_athlete_read on public.workout_items for select to authenticated
  using (exists (select 1 from public.workouts w where w.id = workout_id and w.program_id is not null and public.is_program_athlete(w.program_id)));

-- =====================================================================
-- Guardado atómico de una sesión completa (cabecera + ejercicios).
-- Corre con los permisos del usuario: RLS sigue aplicando.
-- =====================================================================
create or replace function public.save_workout(p_workout uuid, p_data jsonb)
returns void language plpgsql security invoker set search_path = public as $$
declare
  v_org uuid;
  v_item jsonb;
  v_i int := 0;
begin
  select org_id into v_org from public.workouts where id = p_workout;
  if v_org is null or not public.is_org_staff(v_org) then raise exception 'forbidden'; end if;

  update public.workouts set
    name = p_data->>'name',
    goal = nullif(p_data->>'goal', ''),
    est_duration_min = nullif(p_data->>'est_duration_min', '')::smallint,
    focus = coalesce(array(select jsonb_array_elements_text(p_data->'focus')), '{}'),
    notes = nullif(p_data->>'notes', '')
  where id = p_workout;

  delete from public.workout_items where workout_id = p_workout;
  for v_item in select * from jsonb_array_elements(coalesce(p_data->'items', '[]'::jsonb)) loop
    insert into public.workout_items (workout_id, org_id, exercise_id, sort_order, group_label, sets, reps, load, rest_sec, tempo, rpe, notes)
    values (
      p_workout, v_org, (v_item->>'exercise_id')::uuid, v_i,
      nullif(v_item->>'group_label', ''),
      nullif(v_item->>'sets', '')::smallint,
      nullif(v_item->>'reps', ''),
      nullif(v_item->>'load', ''),
      nullif(v_item->>'rest_sec', '')::smallint,
      nullif(v_item->>'tempo', ''),
      nullif(v_item->>'rpe', '')::numeric,
      nullif(v_item->>'notes', '')
    );
    v_i := v_i + 1;
  end loop;
end $$;

-- Copia una sesión (con sus ejercicios) a otro lugar. Devuelve el id nuevo.
create or replace function public.copy_workout(
  p_workout uuid, p_program uuid, p_block uuid, p_week smallint, p_day smallint, p_name text default null
) returns uuid language plpgsql security invoker set search_path = public as $$
declare v_src public.workouts; v_new uuid;
begin
  select * into v_src from public.workouts where id = p_workout;
  if not found or not public.is_org_staff(v_src.org_id) then raise exception 'forbidden'; end if;
  insert into public.workouts (org_id, program_id, block_id, week_index, day_index, name, goal, est_duration_min, focus, notes, sort_order)
  values (v_src.org_id, p_program, p_block, p_week, p_day, coalesce(p_name, v_src.name), v_src.goal, v_src.est_duration_min, v_src.focus, v_src.notes, v_src.sort_order)
  returning id into v_new;
  insert into public.workout_items (workout_id, org_id, exercise_id, sort_order, group_label, sets, reps, load, rest_sec, tempo, rpe, notes)
  select v_new, org_id, exercise_id, sort_order, group_label, sets, reps, load, rest_sec, tempo, rpe, notes
  from public.workout_items where workout_id = p_workout;
  return v_new;
end $$;

-- Copia una planificación entera (bloques, sesiones y ejercicios).
-- p_athlete null = queda como plantilla; con alumno = planificación asignada (borrador).
create or replace function public.copy_program(p_program uuid, p_athlete uuid default null, p_name text default null)
returns uuid language plpgsql security invoker set search_path = public as $$
declare
  v_src public.programs; v_new uuid; v_block record; v_new_block uuid; v_w record;
begin
  select * into v_src from public.programs where id = p_program;
  if not found or not public.is_org_staff(v_src.org_id) then raise exception 'forbidden'; end if;
  insert into public.programs (org_id, athlete_id, name, goal, description, status, source, source_program_id)
  values (v_src.org_id, p_athlete, coalesce(p_name, v_src.name), v_src.goal, v_src.description, 'draft', v_src.source, v_src.id)
  returning id into v_new;
  for v_block in select * from public.program_blocks where program_id = p_program order by sort_order loop
    insert into public.program_blocks (program_id, org_id, name, goal, weeks, sort_order)
    values (v_new, v_block.org_id, v_block.name, v_block.goal, v_block.weeks, v_block.sort_order)
    returning id into v_new_block;
    for v_w in select id, week_index, day_index from public.workouts where block_id = v_block.id loop
      perform public.copy_workout(v_w.id, v_new, v_new_block, v_w.week_index, v_w.day_index);
    end loop;
  end loop;
  return v_new;
end $$;

-- Copia todas las sesiones de una semana de un bloque a otra semana (reemplaza la de destino).
create or replace function public.copy_week(p_block uuid, p_from smallint, p_to smallint)
returns int language plpgsql security invoker set search_path = public as $$
declare v_b public.program_blocks; v_w record; v_n int := 0;
begin
  select * into v_b from public.program_blocks where id = p_block;
  if not found or not public.is_org_staff(v_b.org_id) then raise exception 'forbidden'; end if;
  if p_to < 1 or p_to > v_b.weeks or p_from = p_to then raise exception 'invalid_week'; end if;
  delete from public.workouts where block_id = p_block and week_index = p_to;
  for v_w in select id, day_index from public.workouts where block_id = p_block and week_index = p_from order by day_index, sort_order loop
    perform public.copy_workout(v_w.id, v_b.program_id, p_block, p_to, v_w.day_index);
    v_n := v_n + 1;
  end loop;
  return v_n;
end $$;

revoke execute on function public.save_workout(uuid, jsonb) from anon, public;
revoke execute on function public.copy_workout(uuid, uuid, uuid, smallint, smallint, text) from anon, public;
revoke execute on function public.copy_program(uuid, uuid, text) from anon, public;
revoke execute on function public.copy_week(uuid, smallint, smallint) from anon, public;
grant execute on function public.save_workout(uuid, jsonb) to authenticated;
grant execute on function public.copy_workout(uuid, uuid, uuid, smallint, smallint, text) to authenticated;
grant execute on function public.copy_program(uuid, uuid, text) to authenticated;
grant execute on function public.copy_week(uuid, smallint, smallint) to authenticated;

-- Un ejercicio usado en rutinas no se puede borrar (se archiva).
