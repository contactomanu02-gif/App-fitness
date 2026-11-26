-- =====================================================================
-- Rutinas más simples: duración 60 min por defecto e intensidad (% de la
-- fuerza) por sesión, que el entrenador puede poner para toda una semana.
-- Las pausas y el RPE dejan de mostrarse, pero los datos se conservan.
-- =====================================================================

alter table public.workouts
  add column intensity_pct smallint check (intensity_pct is null or intensity_pct between 1 and 150);
alter table public.workouts alter column est_duration_min set default 60;
update public.workouts set est_duration_min = 60 where est_duration_min is null;

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
    est_duration_min = coalesce(nullif(p_data->>'est_duration_min', '')::smallint, 60),
    intensity_pct = case when p_data ? 'intensity_pct' then nullif(p_data->>'intensity_pct', '')::smallint else intensity_pct end,
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

create or replace function public.copy_workout(
  p_workout uuid, p_program uuid, p_block uuid, p_week smallint, p_day smallint, p_name text default null
) returns uuid language plpgsql security invoker set search_path = public as $$
declare v_src public.workouts; v_new uuid;
begin
  select * into v_src from public.workouts where id = p_workout;
  if not found or not public.is_org_staff(v_src.org_id) then raise exception 'forbidden'; end if;
  insert into public.workouts (org_id, program_id, block_id, week_index, day_index, name, goal, est_duration_min, intensity_pct, focus, notes, sort_order)
  values (v_src.org_id, p_program, p_block, p_week, p_day, coalesce(p_name, v_src.name), v_src.goal, v_src.est_duration_min, v_src.intensity_pct, v_src.focus, v_src.notes, v_src.sort_order)
  returning id into v_new;
  insert into public.workout_items (workout_id, org_id, exercise_id, sort_order, group_label, sets, reps, load, rest_sec, tempo, rpe, notes)
  select v_new, org_id, exercise_id, sort_order, group_label, sets, reps, load, rest_sec, tempo, rpe, notes
  from public.workout_items where workout_id = p_workout;
  return v_new;
end $$;

-- Pone la misma intensidad a todas las sesiones de una semana de un bloque (null = sin intensidad).
create or replace function public.set_week_intensity(p_block uuid, p_week smallint, p_pct smallint)
returns int language plpgsql security invoker set search_path = public as $$
declare v_org uuid; v_n int;
begin
  select org_id into v_org from public.program_blocks where id = p_block;
  if v_org is null or not public.is_org_staff(v_org) then raise exception 'forbidden'; end if;
  update public.workouts set intensity_pct = p_pct where block_id = p_block and week_index = p_week;
  get diagnostics v_n = row_count;
  return v_n;
end $$;

revoke execute on function public.set_week_intensity(uuid, smallint, smallint) from anon, public;
grant execute on function public.set_week_intensity(uuid, smallint, smallint) to authenticated;

-- La importación desde Claude también trae la intensidad («intensidad»).
create or replace function public.import_routine(p_org uuid, p_data jsonb)
returns jsonb language plpgsql security invoker set search_path = public as $$
declare
  v_program uuid; v_block uuid; v_workout uuid;
  b jsonb; s jsonb; v_bi int := 0; v_week int; v_weeks int; v_count int := 0;
begin
  if not public.is_org_staff(p_org) then raise exception 'forbidden'; end if;

  if p_data->>'tipo' = 'sesion' then
    insert into public.workouts (org_id, name) values (p_org, p_data->>'nombre') returning id into v_workout;
    perform public.save_workout(v_workout, jsonb_build_object(
      'name', p_data->>'nombre', 'goal', p_data->>'objetivo', 'est_duration_min', p_data->>'duracion_min',
      'intensity_pct', p_data->>'intensidad',
      'notes', p_data->>'notas', 'items', coalesce(p_data->'items', '[]'::jsonb)));
    return jsonb_build_object('kind', 'workout', 'id', v_workout);
  end if;

  if p_data->>'tipo' <> 'planificacion' then raise exception 'invalid_type'; end if;
  insert into public.programs (org_id, name, goal, description, status)
  values (p_org, p_data->>'nombre', nullif(p_data->>'objetivo', ''), nullif(p_data->>'descripcion', ''), 'draft')
  returning id into v_program;

  for b in select * from jsonb_array_elements(coalesce(p_data->'bloques', '[]'::jsonb)) loop
    v_weeks := (b->>'semanas')::int;
    insert into public.program_blocks (program_id, org_id, name, goal, weeks, sort_order)
    values (v_program, p_org, b->>'nombre', nullif(b->>'objetivo', ''), v_weeks, v_bi)
    returning id into v_block;
    v_bi := v_bi + 1;
    for s in select * from jsonb_array_elements(coalesce(b->'sesiones', '[]'::jsonb)) loop
      for v_week in 1..v_weeks loop
        if (s->>'semana') is not null and (s->>'semana')::int <> v_week then continue; end if;
        v_count := v_count + 1;
        if v_count > 200 then raise exception 'too_many_sessions'; end if;
        insert into public.workouts (org_id, program_id, block_id, week_index, day_index, name)
        values (p_org, v_program, v_block, v_week, (s->>'dia')::smallint, s->>'nombre')
        returning id into v_workout;
        perform public.save_workout(v_workout, jsonb_build_object(
          'name', s->>'nombre', 'goal', s->>'objetivo', 'est_duration_min', s->>'duracion_min',
          'intensity_pct', coalesce(b->'intensidad_por_semana'->>(v_week - 1), s->>'intensidad'),
          'notes', s->>'notas', 'items', coalesce(s->'items', '[]'::jsonb)));
      end loop;
    end loop;
  end loop;
  return jsonb_build_object('kind', 'program', 'id', v_program);
end $$;
