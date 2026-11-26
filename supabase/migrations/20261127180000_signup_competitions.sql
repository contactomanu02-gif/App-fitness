-- Registro: el alumno también carga sus próximas competencias.
drop function if exists public.join_with_code(text, jsonb, jsonb, jsonb);
create or replace function public.join_with_code(p_code text, p_data jsonb, p_sport_values jsonb default '{}'::jsonb, p_injuries jsonb default '[]'::jsonb, p_competitions jsonb default '[]'::jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_org uuid;
  v_email text;
  v_ath uuid;
  v_sport uuid := nullif(p_data->>'sport_id', '')::uuid;
  i jsonb;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  select id into v_org from public.organizations where join_code = upper(trim(p_code));
  if v_org is null then raise exception 'invalid_code'; end if;
  if exists (select 1 from public.memberships where org_id = v_org and user_id = auth.uid() and role in ('owner', 'coach')) then
    raise exception 'is_staff';
  end if;
  if exists (select 1 from public.athletes where org_id = v_org and user_id = auth.uid()) then raise exception 'already_member'; end if;
  if v_sport is not null and not exists (select 1 from public.sports where id = v_sport and (org_id is null or org_id = v_org)) then
    v_sport := null;
  end if;
  select lower(email) into v_email from auth.users where id = auth.uid();

  -- Si el entrenador ya lo había cargado con ese email, se completa esa ficha.
  select id into v_ath from public.athletes where org_id = v_org and lower(email) = v_email and user_id is null for update;
  if v_ath is null then
    insert into public.athletes (org_id, user_id, first_name, email, self_registered)
    values (v_org, auth.uid(), coalesce(nullif(trim(p_data->>'first_name'), ''), 'Alumno'), v_email, true)
    returning id into v_ath;
  else
    update public.athletes set user_id = auth.uid() where id = v_ath;
  end if;

  update public.athletes set
    first_name = coalesce(nullif(trim(p_data->>'first_name'), ''), first_name),
    last_name = coalesce(nullif(trim(p_data->>'last_name'), ''), last_name),
    phone = coalesce(nullif(trim(p_data->>'phone'), ''), phone),
    birth_date = coalesce(nullif(p_data->>'birth_date', '')::date, birth_date),
    sex = coalesce(nullif(p_data->>'sex', ''), sex),
    height_cm = coalesce(nullif(p_data->>'height_cm', '')::numeric, height_cm),
    weight_kg = coalesce(nullif(p_data->>'weight_kg', '')::numeric, weight_kg),
    sport_id = coalesce(v_sport, sport_id),
    level = coalesce(nullif(p_data->>'level', ''), level),
    goals = coalesce(nullif(trim(p_data->>'goals'), ''), goals),
    training_days = case when jsonb_array_length(coalesce(p_data->'training_days', '[]')) > 0
      then array(select jsonb_array_elements_text(p_data->'training_days')) else training_days end,
    sessions_per_week = coalesce(nullif(p_data->>'sessions_per_week', '')::smallint, sessions_per_week)
  where id = v_ath;

  if v_sport is not null and p_sport_values is not null and p_sport_values <> '{}'::jsonb then
    insert into public.athlete_sport_profiles (athlete_id, sport_id, values) values (v_ath, v_sport, p_sport_values)
    on conflict (athlete_id, sport_id) do update set values = excluded.values;
  end if;

  for i in select * from jsonb_array_elements(coalesce(p_injuries, '[]'::jsonb)) loop
    if nullif(trim(i->>'body_area'), '') is not null then
      insert into public.injuries (org_id, athlete_id, body_area, description, severity, status, created_by)
      values (v_org, v_ath, left(trim(i->>'body_area'), 80), nullif(left(trim(i->>'description'), 2000), ''),
              case when i->>'severity' in ('leve', 'moderada', 'grave') then i->>'severity' else 'leve' end, 'activa', auth.uid());
    end if;
  end loop;

  -- Próximas competencias (calendario competitivo)
  for i in select * from jsonb_array_elements(coalesce(p_competitions, '[]'::jsonb)) loop
    if nullif(trim(i->>'title'), '') is not null and (i->>'start_date') ~ '^\d{4}-\d{2}-\d{2}$' then
      insert into public.calendar_events (org_id, athlete_id, kind, title, start_date, end_date, location, created_by)
      values (v_org, v_ath, 'torneo', left(trim(i->>'title'), 120), (i->>'start_date')::date,
              greatest((i->>'start_date')::date, least(coalesce(nullif(i->>'end_date', '')::date, (i->>'start_date')::date), (i->>'start_date')::date + 60)),
              nullif(left(trim(coalesce(i->>'location', '')), 120), ''), auth.uid());
    end if;
  end loop;

  insert into public.memberships (org_id, user_id, role) values (v_org, auth.uid(), 'athlete') on conflict do nothing;
  return v_ath;
end $$;
revoke execute on function public.join_with_code(text, jsonb, jsonb, jsonb, jsonb) from public, anon;
grant execute on function public.join_with_code(text, jsonb, jsonb, jsonb, jsonb) to authenticated;
