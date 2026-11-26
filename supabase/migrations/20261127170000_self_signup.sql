-- =====================================================================
-- Registro de alumnos por su cuenta con el enlace/código del entrenador.
-- =====================================================================
create or replace function public.new_join_code() returns text
language sql volatile set search_path = public, extensions as $$
  -- 6 caracteres sin letras/números que se confundan (0/O, 1/I/L)
  select string_agg(substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789', 1 + (get_byte(extensions.gen_random_bytes(1), 0) % 31), 1), '')
  from generate_series(1, 6)
$$;

alter table public.organizations add column if not exists join_code text;
update public.organizations set join_code = public.new_join_code() where join_code is null;
alter table public.organizations alter column join_code set default public.new_join_code();
alter table public.organizations alter column join_code set not null;
create unique index if not exists organizations_join_code on public.organizations(join_code);

alter table public.athletes add column if not exists self_registered boolean not null default false;

-- Datos públicos para el formulario de registro: nombre del entrenador y deportes.
create or replace function public.get_join_info(p_code text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'org_name', o.name,
    'sports', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', s.id, 'name', s.name, 'slug', s.slug,
        'fields', coalesce((select jsonb_agg(jsonb_build_object('key', f.key, 'label', f.label, 'field_type', f.field_type, 'unit', f.unit, 'options', f.options, 'sort_order', f.sort_order) order by f.sort_order)
                            from public.sport_fields f where f.sport_id = s.id), '[]'::jsonb)
      ) order by (s.slug = 'golf') desc, s.name)
      from public.sports s where s.org_id is null or s.org_id = o.id), '[]'::jsonb)
  )
  from public.organizations o where o.join_code = upper(trim(p_code))
$$;
grant execute on function public.get_join_info(text) to anon, authenticated;

-- El alumno ya autenticado se suma a la organización con sus datos.
create or replace function public.join_with_code(p_code text, p_data jsonb, p_sport_values jsonb default '{}'::jsonb, p_injuries jsonb default '[]'::jsonb)
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

  insert into public.memberships (org_id, user_id, role) values (v_org, auth.uid(), 'athlete') on conflict do nothing;
  return v_ath;
end $$;
revoke execute on function public.join_with_code(text, jsonb, jsonb, jsonb) from public, anon;
grant execute on function public.join_with_code(text, jsonb, jsonb, jsonb) to authenticated;

-- El entrenador puede cambiar el código (el enlace anterior deja de servir).
create or replace function public.regenerate_join_code(p_org uuid)
returns text language plpgsql security definer set search_path = public as $$
declare v text;
begin
  if not public.is_org_staff(p_org) then raise exception 'forbidden'; end if;
  loop
    v := public.new_join_code();
    begin
      update public.organizations set join_code = v where id = p_org;
      exit;
    exception when unique_violation then null;
    end;
  end loop;
  return v;
end $$;
