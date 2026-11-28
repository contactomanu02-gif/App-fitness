-- =====================================================================
-- La planificación se acomoda a los días que entrena cada alumno.
-- Al asignar, la copia del alumno mueve sus sesiones (semana por semana) a los
-- días que el alumno marcó en su ficha (athletes.training_days), respetando el
-- orden y lo más parecido posible al reparto de la plantilla.
-- Si el alumno no tiene días cargados, quedan los días de la plantilla.
-- =====================================================================

-- Días que entrena el alumno, como números (lunes = 1 … domingo = 7), ordenados.
create or replace function public.athlete_weekdays(p_athlete uuid)
returns smallint[] language sql stable security invoker set search_path = public as $$
  select coalesce((
    select array_agg(distinct x.n order by x.n)
    from public.athletes a,
         lateral unnest(a.training_days) d,
         lateral (select (case d when 'lun' then 1 when 'mar' then 2 when 'mie' then 3 when 'jue' then 4
                                  when 'vie' then 5 when 'sab' then 6 when 'dom' then 7 end)::smallint as n) x
    where a.id = p_athlete and x.n is not null
  ), '{}'::smallint[])
$$;

-- A qué día va cada día de la plantilla (p_tpl ordenado y sin repetidos) según
-- los días del alumno (p_avail ordenado y sin repetidos). Devuelve un arreglo
-- alineado con p_tpl.
--  * Si los días de la plantilla ya son días del alumno, no cambia nada.
--  * Si al alumno le sobran días, elige los que más se parecen a la plantilla.
--  * Si tiene menos días que sesiones, llena todos sus días y las sesiones que
--    no entran van al día libre más cercano al de la plantilla.
create or replace function public.map_weekdays(p_tpl smallint[], p_avail smallint[])
returns smallint[] language plpgsql immutable set search_path = public as $$
declare
  k int := coalesce(cardinality(p_tpl), 0);
  n int := coalesce(cardinality(p_avail), 0);
  v_best smallint[]; v_best_cost int; v_cost int; v_sub smallint[]; v_res smallint[];
  v_used smallint[]; v_d smallint; m int; i int;
begin
  if k = 0 or n = 0 or p_tpl <@ p_avail then return p_tpl; end if;
  if k <= n then
    for m in 1..127 loop
      v_sub := array(select d::smallint from generate_series(1, 7) d where (m >> (d - 1)) & 1 = 1 order by d);
      continue when cardinality(v_sub) <> k or not (v_sub <@ p_avail);
      v_cost := 0;
      for i in 1..k loop v_cost := v_cost + abs(v_sub[i] - p_tpl[i]); end loop;
      if v_best_cost is null or v_cost < v_best_cost then v_best_cost := v_cost; v_best := v_sub; end if;
    end loop;
    return v_best;
  end if;
  -- Más sesiones que días: qué n sesiones van a los días del alumno.
  for m in 1..((1 << k) - 1) loop
    v_sub := array(select j::smallint from generate_series(1, k) j where (m >> (j - 1)) & 1 = 1 order by j);
    continue when cardinality(v_sub) <> n;
    v_cost := 0;
    for i in 1..n loop v_cost := v_cost + abs(p_avail[i] - p_tpl[v_sub[i]]); end loop;
    if v_best_cost is null or v_cost < v_best_cost then v_best_cost := v_cost; v_best := v_sub; end if;
  end loop;
  v_res := array_fill(null::smallint, array[k]);
  for i in 1..n loop v_res[v_best[i]] := p_avail[i]; end loop;
  v_used := p_avail;
  for i in 1..k loop
    continue when v_res[i] is not null;
    select d::smallint into v_d from generate_series(1, 7) d
      where not (d::smallint = any (v_used)) order by abs(d - p_tpl[i]), d limit 1;
    v_res[i] := v_d;
    v_used := v_used || v_d;
  end loop;
  return v_res;
end $$;

-- Mueve las sesiones de una planificación (copia de un alumno) a sus días.
create or replace function public.fit_program_to_athlete(p_program uuid, p_athlete uuid)
returns int language plpgsql security invoker set search_path = public as $$
declare v_days smallint[]; r record; v_map smallint[]; v_n int := 0; v_c int;
begin
  v_days := public.athlete_weekdays(p_athlete);
  if cardinality(v_days) = 0 then return 0; end if;
  for r in
    select block_id, week_index, array_agg(distinct day_index order by day_index) as tpl
    from public.workouts
    where program_id = p_program and block_id is not null
    group by block_id, week_index
  loop
    v_map := public.map_weekdays(r.tpl, v_days);
    continue when v_map = r.tpl;
    update public.workouts w set day_index = v_map[array_position(r.tpl, w.day_index)]
    where w.program_id = p_program and w.block_id = r.block_id and w.week_index = r.week_index;
    get diagnostics v_c = row_count;
    v_n := v_n + v_c;
  end loop;
  return v_n;
end $$;

-- Asignar planificación: ahora, por defecto, acomoda las sesiones a los días de cada alumno.
drop function public.assign_program(uuid, uuid[], date);
create function public.assign_program(p_program uuid, p_athletes uuid[], p_start date, p_adapt boolean default true)
returns int language plpgsql security invoker set search_path = public as $$
declare v_src public.programs; v_a uuid; v_new uuid; v_n int := 0;
begin
  select * into v_src from public.programs where id = p_program;
  if not found or not public.is_org_staff(v_src.org_id) then raise exception 'forbidden'; end if;
  if p_start is null then raise exception 'start_required'; end if;
  foreach v_a in array p_athletes loop
    if public.athlete_org(v_a) is distinct from v_src.org_id then raise exception 'org_mismatch'; end if;
    v_new := public.copy_program(p_program, v_a);
    if coalesce(p_adapt, true) then perform public.fit_program_to_athlete(v_new, v_a); end if;
    update public.programs set status = 'active', start_date = p_start where id = v_new;
    perform public.schedule_program(v_new);
    v_n := v_n + 1;
  end loop;
  return v_n;
end $$;

revoke execute on function public.athlete_weekdays(uuid) from anon, public;
revoke execute on function public.map_weekdays(smallint[], smallint[]) from anon, public;
revoke execute on function public.fit_program_to_athlete(uuid, uuid) from anon, public;
revoke execute on function public.assign_program(uuid, uuid[], date, boolean) from anon, public;
grant execute on function public.athlete_weekdays(uuid) to authenticated;
grant execute on function public.map_weekdays(smallint[], smallint[]) to authenticated;
grant execute on function public.fit_program_to_athlete(uuid, uuid) to authenticated;
grant execute on function public.assign_program(uuid, uuid[], date, boolean) to authenticated;
