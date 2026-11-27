-- =====================================================================
-- Progreso del alumno: control mensual de pesos en los básicos y desafíos mensuales.
-- =====================================================================

-- ---------- control mensual de los básicos ----------
-- Una fila por alumno, mes y ejercicio básico. month = primer día del mes.
create table public.lift_records (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  athlete_id uuid not null references public.athletes(id) on delete cascade,
  month date not null check (extract(day from month) = 1),
  lift text not null check (lift in ('sentadilla', 'press_banca', 'jalon_pecho')),
  weight_kg numeric(5,1) not null check (weight_kg between 1 and 500),
  reps smallint not null check (reps between 1 and 30),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (athlete_id, month, lift)
);
create index lift_records_athlete_idx on public.lift_records(athlete_id, month);
create trigger lift_records_updated_at before update on public.lift_records
  for each row execute function public.set_updated_at();

alter table public.lift_records enable row level security;
create policy lift_records_staff on public.lift_records for all to authenticated
  using (public.is_org_staff(org_id)) with check (public.is_org_staff(org_id) and org_id = public.athlete_org(athlete_id));
create policy lift_records_self_read on public.lift_records for select to authenticated using (public.is_self_athlete(athlete_id));
-- El alumno escribe solo con save_my_lifts.

alter table public.alerts drop constraint alerts_kind_check;
alter table public.alerts add constraint alerts_kind_check
  check (kind in ('pain', 'skipped', 'rpe_high', 'swap', 'missing', 'lifts'));

-- El alumno carga sus pesos del mes actual (p_items: [{lift, weight_kg, reps}]). Avisa al entrenador.
create or replace function public.save_my_lifts(p_athlete uuid, p_month date, p_items jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_ath public.athletes;
  v_item jsonb;
  v_text text := '';
  v_names jsonb := '{"sentadilla":"Sentadilla","press_banca":"Press de banca","jalon_pecho":"Jalón al pecho"}';
  v_now date := (now() at time zone 'America/Argentina/Buenos_Aires')::date;
begin
  select * into v_ath from public.athletes where id = p_athlete and user_id = auth.uid();
  if not found then raise exception 'forbidden'; end if;
  -- Solo el mes en curso (o el anterior, por si cambia el mes de noche).
  if p_month <> date_trunc('month', v_now)::date and p_month <> (date_trunc('month', v_now) - interval '1 month')::date then
    raise exception 'invalid_month';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then raise exception 'empty'; end if;
  for v_item in select * from jsonb_array_elements(p_items) loop
    insert into public.lift_records (org_id, athlete_id, month, lift, weight_kg, reps, created_by)
    values (v_ath.org_id, v_ath.id, p_month, v_item->>'lift', (v_item->>'weight_kg')::numeric, (v_item->>'reps')::smallint, auth.uid())
    on conflict (athlete_id, month, lift) do update set weight_kg = excluded.weight_kg, reps = excluded.reps, created_by = excluded.created_by;
    v_text := v_text || case when v_text = '' then '' else ', ' end
      || coalesce(v_names->>(v_item->>'lift'), v_item->>'lift') || ' ' || replace((v_item->>'weight_kg'), '.', ',') || ' kg x' || (v_item->>'reps');
  end loop;
  delete from public.alerts where athlete_id = v_ath.id and kind = 'lifts' and read_at is null;
  insert into public.alerts (org_id, athlete_id, kind, message)
  values (v_ath.org_id, v_ath.id, 'lifts',
          format('%s cargó sus pesos del mes: %s.', trim(v_ath.first_name || ' ' || coalesce(v_ath.last_name, '')), v_text));
end $$;
revoke execute on function public.save_my_lifts(uuid, date, jsonb) from anon, public;
grant execute on function public.save_my_lifts(uuid, date, jsonb) to authenticated;

-- ---------- desafíos mensuales ----------
-- Cada desafío tiene etapas que se desbloquean en orden: [{text, times}].
create table public.challenges (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  month date not null check (extract(day from month) = 1),
  title text not null check (char_length(title) between 1 and 80),
  description text check (description is null or char_length(description) <= 300),
  icon text not null default 'run' check (char_length(icon) <= 20),
  steps jsonb not null check (jsonb_typeof(steps) = 'array' and jsonb_array_length(steps) between 1 and 8),
  points smallint not null default 100 check (points between 10 and 1000),
  sort_order smallint not null default 0,
  template_key text,
  created_at timestamptz not null default now()
);
create index challenges_org_month_idx on public.challenges(org_id, month, sort_order);

-- Meses ya preparados (para no volver a cargar los sugeridos si el entrenador los borró).
create table public.challenge_months (
  org_id uuid not null references public.organizations(id) on delete cascade,
  month date not null,
  created_at timestamptz not null default now(),
  primary key (org_id, month)
);

create table public.challenge_logs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  athlete_id uuid not null references public.athletes(id) on delete cascade,
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  step smallint not null check (step between 0 and 7),
  done_on date not null,
  created_at timestamptz not null default now(),
  unique (athlete_id, challenge_id, done_on)
);
create index challenge_logs_athlete_idx on public.challenge_logs(athlete_id, challenge_id);

alter table public.challenges enable row level security;
alter table public.challenge_months enable row level security;
alter table public.challenge_logs enable row level security;

create policy challenges_staff on public.challenges for all to authenticated
  using (public.is_org_staff(org_id)) with check (public.is_org_staff(org_id));
create policy challenges_member_read on public.challenges for select to authenticated using (public.is_org_member(org_id));
create policy challenge_months_staff on public.challenge_months for all to authenticated
  using (public.is_org_staff(org_id)) with check (public.is_org_staff(org_id));
create policy challenge_logs_staff_read on public.challenge_logs for select to authenticated using (public.is_org_staff(org_id));
create policy challenge_logs_self_read on public.challenge_logs for select to authenticated using (public.is_self_athlete(athlete_id));

-- Total de veces de un desafío.
create or replace function public.challenge_total(p_steps jsonb) returns int
language sql immutable as $$
  select coalesce(sum(greatest(1, (s->>'times')::int)), 0)::int from jsonb_array_elements(p_steps) s;
$$;

-- El alumno marca "lo hice hoy" (una vez por día y desafío). Devuelve cuántas veces lleva.
create or replace function public.log_challenge(p_challenge uuid, p_day date)
returns int language plpgsql security definer set search_path = public as $$
declare
  v_ch public.challenges;
  v_ath public.athletes;
  v_done int;
  v_step int := 0;
  v_acc int := 0;
  v_s jsonb;
  v_now date := (now() at time zone 'America/Argentina/Buenos_Aires')::date;
begin
  select * into v_ch from public.challenges where id = p_challenge;
  if not found then raise exception 'not_found'; end if;
  select * into v_ath from public.athletes where org_id = v_ch.org_id and user_id = auth.uid() and status = 'active' order by created_at limit 1;
  if not found then raise exception 'forbidden'; end if;
  if p_day > v_now or p_day < v_now - 1 then raise exception 'invalid_day'; end if;
  if date_trunc('month', p_day)::date <> v_ch.month then raise exception 'other_month'; end if;
  select count(*) into v_done from public.challenge_logs where athlete_id = v_ath.id and challenge_id = v_ch.id;
  if v_done >= public.challenge_total(v_ch.steps) then return v_done; end if;
  -- Etapa en la que cae esta vez.
  for v_s in select * from jsonb_array_elements(v_ch.steps) loop
    v_acc := v_acc + greatest(1, (v_s->>'times')::int);
    exit when v_done < v_acc;
    v_step := v_step + 1;
  end loop;
  insert into public.challenge_logs (org_id, athlete_id, challenge_id, step, done_on)
  values (v_ch.org_id, v_ath.id, v_ch.id, v_step, p_day)
  on conflict (athlete_id, challenge_id, done_on) do nothing;
  select count(*) into v_done from public.challenge_logs where athlete_id = v_ath.id and challenge_id = v_ch.id;
  return v_done;
end $$;

-- Deshace la última marca del alumno en un desafío (por si se equivocó).
create or replace function public.undo_challenge(p_challenge uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  select l.id into v_id from public.challenge_logs l
  join public.athletes a on a.id = l.athlete_id and a.user_id = auth.uid()
  where l.challenge_id = p_challenge order by l.done_on desc, l.created_at desc limit 1;
  if v_id is null then return; end if;
  delete from public.challenge_logs where id = v_id;
end $$;

revoke execute on function public.log_challenge(uuid, date) from anon, public;
revoke execute on function public.undo_challenge(uuid) from anon, public;
grant execute on function public.log_challenge(uuid, date) to authenticated;
grant execute on function public.undo_challenge(uuid) to authenticated;
