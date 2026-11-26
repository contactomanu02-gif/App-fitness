-- =====================================================================
-- Variantes: el alumno avisa que no pudo hacer un ejercicio (por ejemplo,
-- le falta el elemento) y puede elegir otro que lo reemplace desde ahora.
-- El entrenador recibe un aviso y puede quitar la variante cuando quiera.
-- =====================================================================

alter table public.alerts drop constraint alerts_kind_check;
alter table public.alerts add constraint alerts_kind_check check (kind in ('pain', 'skipped', 'rpe_high', 'swap', 'missing'));

create table public.exercise_swaps (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  athlete_id uuid not null references public.athletes(id) on delete cascade,
  original_exercise_id uuid not null references public.exercises(id) on delete cascade,
  replacement_exercise_id uuid not null references public.exercises(id) on delete cascade,
  reason text not null check (reason in ('sin_elemento', 'molestia', 'otro')),
  note text check (note is null or char_length(note) <= 300),
  created_at timestamptz not null default now(),
  unique (athlete_id, original_exercise_id),
  check (original_exercise_id <> replacement_exercise_id)
);

alter table public.exercise_swaps enable row level security;
create policy swaps_staff_read on public.exercise_swaps for select to authenticated using (public.is_org_staff(org_id));
create policy swaps_athlete_read on public.exercise_swaps for select to authenticated using (public.is_self_athlete(athlete_id));
create policy swaps_staff_delete on public.exercise_swaps for delete to authenticated using (public.is_org_staff(org_id));
-- El alumno escribe solo con report_exercise().

-- El alumno avisa sobre un ejercicio de su sesión. Con reemplazo, queda como variante para las próximas veces.
create or replace function public.report_exercise(p_scheduled uuid, p_item uuid, p_reason text, p_replacement uuid, p_note text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v public.scheduled_workouts := public.my_schedule(p_scheduled);
  v_ex uuid; v_name text; v_who text; v_session text; v_rep text; v_why text;
begin
  if p_reason not in ('sin_elemento', 'molestia', 'otro') then raise exception 'invalid_reason'; end if;
  select i.exercise_id, e.name into v_ex, v_name from public.workout_items i join public.exercises e on e.id = i.exercise_id
  where i.id = p_item and i.workout_id = v.workout_id;
  if v_ex is null then raise exception 'item_mismatch'; end if;
  select trim(first_name || ' ' || coalesce(last_name, '')) into v_who from public.athletes where id = v.athlete_id;
  select name into v_session from public.workouts where id = v.workout_id;
  v_why := case p_reason when 'sin_elemento' then 'no tenía el elemento' when 'molestia' then 'le molestaba' else 'otro motivo' end;

  if p_replacement is not null then
    select name into v_rep from public.exercises where id = p_replacement and (org_id is null or org_id = v.org_id) and not archived;
    if v_rep is null or p_replacement = v_ex then raise exception 'invalid_replacement'; end if;
    insert into public.exercise_swaps (org_id, athlete_id, original_exercise_id, replacement_exercise_id, reason, note)
    values (v.org_id, v.athlete_id, v_ex, p_replacement, p_reason, nullif(trim(p_note), ''))
    on conflict (athlete_id, original_exercise_id) do update
      set replacement_exercise_id = excluded.replacement_exercise_id, reason = excluded.reason, note = excluded.note, created_at = now();
    insert into public.alerts (org_id, athlete_id, kind, message)
    values (v.org_id, v.athlete_id, 'swap',
      format('%s cambió «%s» por «%s» en «%s» (%s).', v_who, v_name, v_rep, v_session, v_why) || coalesce(' ' || nullif(trim(p_note), ''), ''));
  else
    insert into public.alerts (org_id, athlete_id, kind, message)
    values (v.org_id, v.athlete_id, 'missing',
      format('%s no pudo hacer «%s» en «%s» (%s).', v_who, v_name, v_session, v_why) || coalesce(' ' || nullif(trim(p_note), ''), ''));
  end if;
end $$;

-- El alumno vuelve al ejercicio original.
create or replace function public.clear_my_swap(p_swap uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from public.exercise_swaps where id = p_swap and public.is_self_athlete(athlete_id);
end $$;

-- Las series de un ejercicio cambiado se guardan con el ejercicio que realmente hizo.
create or replace function public.log_set(p_scheduled uuid, p_item uuid, p_set smallint, p_reps smallint, p_load numeric, p_done boolean)
returns void language plpgsql security definer set search_path = public as $$
declare v public.scheduled_workouts := public.my_schedule(p_scheduled); v_ex uuid;
begin
  select exercise_id into v_ex from public.workout_items where id = p_item and workout_id = v.workout_id;
  if v_ex is null then raise exception 'item_mismatch'; end if;
  select coalesce((select replacement_exercise_id from public.exercise_swaps where athlete_id = v.athlete_id and original_exercise_id = v_ex), v_ex) into v_ex;
  if not p_done then
    delete from public.set_logs where scheduled_id = v.id and workout_item_id = p_item and set_number = p_set;
    return;
  end if;
  insert into public.set_logs (org_id, athlete_id, scheduled_id, workout_item_id, exercise_id, set_number, reps, load_kg, done)
  values (v.org_id, v.athlete_id, v.id, p_item, v_ex, p_set, p_reps, p_load, true)
  on conflict (scheduled_id, workout_item_id, set_number) do update set exercise_id = excluded.exercise_id, reps = excluded.reps, load_kg = excluded.load_kg, logged_at = now();
  update public.scheduled_workouts set started_at = coalesce(started_at, now()) where id = v.id;
end $$;

revoke execute on function public.report_exercise(uuid, uuid, text, uuid, text) from anon, public;
revoke execute on function public.clear_my_swap(uuid) from anon, public;
grant execute on function public.report_exercise(uuid, uuid, text, uuid, text) to authenticated;
grant execute on function public.clear_my_swap(uuid) to authenticated;
