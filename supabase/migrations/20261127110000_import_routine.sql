-- =====================================================================
-- Importar una rutina armada fuera de la app (texto pegado por el entrenador).
-- Crea una plantilla (sesión suelta o planificación en borrador) en una sola
-- operación. Los ejercicios ya vienen resueltos a ids de la biblioteca.
--
-- p_data (sesión):        {tipo:'sesion', nombre, objetivo?, duracion_min?, notas?, items:[...]}
-- p_data (planificación): {tipo:'planificacion', nombre, objetivo?, descripcion?,
--                          bloques:[{nombre, objetivo?, semanas, sesiones:[{semana?, dia, nombre, objetivo?, duracion_min?, notas?, items:[...]}]}]}
-- items: [{exercise_id, group_label?, sets?, reps?, load?, rest_sec?, tempo?, rpe?, notes?}]
-- Una sesión sin «semana» se repite en todas las semanas del bloque.
-- Devuelve {kind:'workout'|'program', id}.
-- =====================================================================

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
          'notes', s->>'notas', 'items', coalesce(s->'items', '[]'::jsonb)));
      end loop;
    end loop;
  end loop;
  return jsonb_build_object('kind', 'program', 'id', v_program);
end $$;

revoke execute on function public.import_routine(uuid, jsonb) from anon, public;
grant execute on function public.import_routine(uuid, jsonb) to authenticated;
