-- =====================================================================
-- Proteger el historial de los alumnos.
-- Una sesión que el alumno ya cerró (hecha, en parte o no realizada) es historia:
-- borrar una planificación, un bloque, achicar semanas o sacar la sesión del
-- calendario ya NO la borra. Solo se borra si se borra al alumno entero.
-- =====================================================================

-- ¿Esta sesión ya tiene registro del alumno?
create or replace function public.workout_has_history(p_workout uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.scheduled_workouts s
    where s.workout_id = p_workout
      and (s.status <> 'planned' or s.completed_at is not null
           or exists (select 1 from public.set_logs l where l.scheduled_id = s.id))
  );
$$;

-- Al borrar una planificación o un bloque, las sesiones con historia se separan
-- (quedan como sesiones sueltas del alumno, con su fecha y sus registros).
create or replace function public.keep_history_on_program_delete()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_ids uuid[];
begin
  -- Si se está borrando al alumno o el espacio entero, no hay nada que conservar.
  if not exists (select 1 from public.organizations o where o.id = old.org_id) then return old; end if;
  select coalesce(array_agg(w.id), '{}') into v_ids
  from public.workouts w
  where w.athlete_id is not null
    and exists (select 1 from public.athletes a where a.id = w.athlete_id)
    and (case when tg_table_name = 'programs' then w.program_id = old.id else w.block_id = old.id end)
    and public.workout_has_history(w.id);
  if cardinality(v_ids) > 0 then
    update public.scheduled_workouts set program_id = null where workout_id = any (v_ids);
    update public.workouts set program_id = null, block_id = null, week_index = null, day_index = null where id = any (v_ids);
  end if;
  return old;
end $$;

create trigger programs_keep_history before delete on public.programs
  for each row execute function public.keep_history_on_program_delete();
create trigger program_blocks_keep_history before delete on public.program_blocks
  for each row execute function public.keep_history_on_program_delete();

-- Borrar directamente una sesión con historia no hace nada (salvo que se esté
-- borrando al alumno o al espacio completo).
create or replace function public.keep_history_on_workout_delete()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.athlete_id is not null
     and exists (select 1 from public.athletes a where a.id = old.athlete_id)
     and exists (select 1 from public.organizations o where o.id = old.org_id)
     and public.workout_has_history(old.id) then
    return null;
  end if;
  return old;
end $$;

create trigger workouts_keep_history before delete on public.workouts
  for each row execute function public.keep_history_on_workout_delete();

-- Las cargas registradas no se pierden si se borra un ejercicio propio:
-- el ejercicio con registros no se puede borrar (se archiva desde la app).
alter table public.set_logs drop constraint set_logs_exercise_id_fkey;
alter table public.set_logs add constraint set_logs_exercise_id_fkey
  foreign key (exercise_id) references public.exercises(id) on delete restrict;
