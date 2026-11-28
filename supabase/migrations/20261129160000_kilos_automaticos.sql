-- Kilos sugeridos automáticos: al cerrar la sesión el alumno puede anotar con cuántos kilos
-- hizo cada ejercicio y cómo le quedó. La app estima su máximo en ese ejercicio y con eso
-- calcula los kilos de cada % en las próximas sesiones.

alter table public.set_logs
  add column if not exists feel text check (feel is null or feel in ('liviano', 'justo', 'pesado')),
  add column if not exists est_max_kg numeric(6,1) check (est_max_kg is null or est_max_kg between 0 and 2000);

create index if not exists set_logs_athlete_max_idx on public.set_logs(athlete_id, logged_at desc) where est_max_kg is not null;

-- p_items: [{ "item": uuid, "kg": número o null, "reps": número o null, "feel": texto, "max": número o null }]
-- Un registro por ejercicio (serie 1). kg null borra lo que había anotado para ese ejercicio.
create or replace function public.save_session_loads(p_scheduled uuid, p_items jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare v public.scheduled_workouts := public.my_schedule(p_scheduled); r jsonb; v_ex uuid; v_kg numeric; v_max numeric; v_feel text; v_reps int;
begin
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) > 60 then raise exception 'invalid_items'; end if;
  for r in select * from jsonb_array_elements(p_items) loop
    select exercise_id into v_ex from public.workout_items where id = (r->>'item')::uuid and workout_id = v.workout_id;
    if v_ex is null then raise exception 'item_mismatch'; end if;
    select coalesce((select replacement_exercise_id from public.exercise_swaps where athlete_id = v.athlete_id and original_exercise_id = v_ex), v_ex) into v_ex;
    delete from public.set_logs where scheduled_id = v.id and workout_item_id = (r->>'item')::uuid;
    v_kg := nullif(r->>'kg', '')::numeric;
    if v_kg is null then continue; end if;
    if v_kg <= 0 or v_kg > 500 then raise exception 'invalid_kg'; end if;
    v_reps := nullif(r->>'reps', '')::int;
    if v_reps is not null and (v_reps < 1 or v_reps > 100) then v_reps := null; end if;
    v_feel := case when r->>'feel' in ('liviano', 'justo', 'pesado') then r->>'feel' end;
    v_max := nullif(r->>'max', '')::numeric;
    -- El máximo estimado nunca puede ser menor a lo levantado ni absurdo.
    if v_max is not null and (v_max < v_kg or v_max > v_kg * 3) then v_max := null; end if;
    insert into public.set_logs (org_id, athlete_id, scheduled_id, workout_item_id, exercise_id, set_number, reps, load_kg, done, feel, est_max_kg)
    values (v.org_id, v.athlete_id, v.id, (r->>'item')::uuid, v_ex, 1, v_reps, v_kg, true, v_feel, round(v_max, 1));
  end loop;
end $$;

revoke execute on function public.save_session_loads(uuid, jsonb) from anon, public;
grant execute on function public.save_session_loads(uuid, jsonb) to authenticated;
