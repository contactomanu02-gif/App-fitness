-- =====================================================================
-- Evaluación física: pruebas de cada entrenador (copiadas de una lista
-- inicial y editables), evaluaciones por alumno y sus resultados.
-- Solo el entrenador ve las evaluaciones.
-- =====================================================================

-- Lista inicial sugerida (global, solo lectura). Cada organización recibe su propia copia editable.
create table public.assessment_test_catalog (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  category text not null,
  kind text not null check (kind in ('pass_fail', 'number')),
  unit text,
  bilateral boolean not null default false,
  higher_is_better boolean not null default true,
  target numeric,
  instructions text,
  sort_order int not null default 0
);

create table public.assessment_tests (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 80),
  category text not null check (category in ('movilidad', 'estabilidad', 'fuerza', 'potencia', 'golf', 'otra')),
  kind text not null check (kind in ('pass_fail', 'number')),
  unit text check (unit is null or char_length(unit) <= 12),
  bilateral boolean not null default false,
  higher_is_better boolean not null default true,
  target numeric,
  instructions text check (instructions is null or char_length(instructions) <= 1000),
  sort_order int not null default 0,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  check (kind = 'number' or (unit is null and target is null))
);
create index assessment_tests_org_idx on public.assessment_tests(org_id, archived, sort_order);
create unique index assessment_tests_org_name on public.assessment_tests(org_id, lower(name)) where not archived;

create table public.assessments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  athlete_id uuid not null references public.athletes(id) on delete cascade,
  date date not null default current_date,
  notes text check (notes is null or char_length(notes) <= 2000),
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index assessments_athlete_idx on public.assessments(athlete_id, date desc);
create trigger assessments_updated_at before update on public.assessments
  for each row execute function public.set_updated_at();

create table public.assessment_results (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  test_id uuid not null references public.assessment_tests(id) on delete cascade,
  side text not null default '-' check (side in ('-', 'I', 'D')),
  value numeric check (value is null or value between -10000 and 10000),
  passed boolean,
  note text check (note is null or char_length(note) <= 300),
  unique (assessment_id, test_id, side),
  check (value is not null or passed is not null)
);
create index assessment_results_assessment_idx on public.assessment_results(assessment_id);

alter table public.assessment_test_catalog enable row level security;
alter table public.assessment_tests enable row level security;
alter table public.assessments enable row level security;
alter table public.assessment_results enable row level security;

create policy assessment_catalog_read on public.assessment_test_catalog for select to authenticated using (true);
create policy assessment_tests_staff on public.assessment_tests for all to authenticated
  using (public.is_org_staff(org_id)) with check (public.is_org_staff(org_id));
create policy assessments_staff on public.assessments for all to authenticated
  using (public.is_org_staff(org_id)) with check (public.is_org_staff(org_id));
create policy assessment_results_staff on public.assessment_results for all to authenticated
  using (public.is_org_staff(org_id)) with check (public.is_org_staff(org_id));

-- Copia la lista inicial a la organización si todavía no tiene pruebas.
create or replace function public.init_assessment_tests(p_org uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_org_staff(p_org) then raise exception 'forbidden'; end if;
  if exists (select 1 from public.assessment_tests where org_id = p_org) then return; end if;
  insert into public.assessment_tests (org_id, name, category, kind, unit, bilateral, higher_is_better, target, instructions, sort_order)
  select p_org, name, category, kind, unit, bilateral, higher_is_better, target, instructions, sort_order
  from public.assessment_test_catalog order by sort_order;
end $$;

-- Guarda una evaluación completa (nueva o existente) con todos sus resultados, en una sola operación.
-- p_results: [{test_id, side, value, passed, note}]
create or replace function public.save_assessment(
  p_assessment uuid, p_athlete uuid, p_date date, p_notes text, p_results jsonb
) returns uuid language plpgsql security invoker set search_path = public as $$
declare v_org uuid; v_id uuid := p_assessment; r jsonb;
begin
  select org_id into v_org from public.athletes where id = p_athlete;
  if v_org is null or not public.is_org_staff(v_org) then raise exception 'forbidden'; end if;
  if v_id is null then
    insert into public.assessments (org_id, athlete_id, date, notes)
    values (v_org, p_athlete, coalesce(p_date, current_date), nullif(trim(p_notes), ''))
    returning id into v_id;
  else
    update public.assessments set date = coalesce(p_date, date), notes = nullif(trim(p_notes), '')
    where id = v_id and athlete_id = p_athlete;
    if not found then raise exception 'not_found'; end if;
    delete from public.assessment_results where assessment_id = v_id;
  end if;
  for r in select * from jsonb_array_elements(coalesce(p_results, '[]'::jsonb)) loop
    if (r->>'value') is null and (r->>'passed') is null then continue; end if;
    if not exists (select 1 from public.assessment_tests t where t.id = (r->>'test_id')::uuid and t.org_id = v_org) then
      raise exception 'test_mismatch';
    end if;
    insert into public.assessment_results (org_id, assessment_id, test_id, side, value, passed, note)
    values (v_org, v_id, (r->>'test_id')::uuid, coalesce(nullif(r->>'side', ''), '-'),
            (r->>'value')::numeric, (r->>'passed')::boolean, nullif(trim(r->>'note'), ''));
  end loop;
  return v_id;
end $$;

revoke execute on function public.init_assessment_tests(uuid) from anon, public;
revoke execute on function public.save_assessment(uuid, uuid, date, text, jsonb) from anon, public;
grant execute on function public.init_assessment_tests(uuid) to authenticated;
grant execute on function public.save_assessment(uuid, uuid, date, text, jsonb) to authenticated;

-- ---------- Lista inicial (pensada para golfistas; cada entrenador la ajusta) ----------
insert into public.assessment_test_catalog (sort_order, name, category, kind, unit, bilateral, higher_is_better, target, instructions) values
  (10, 'Inclinación pélvica', 'movilidad', 'pass_fail', null, false, true, null, 'En postura de golf, llevar la pelvis a anteversión y retroversión sin mover el torso.'),
  (20, 'Rotación pélvica', 'movilidad', 'pass_fail', null, false, true, null, 'En postura de golf, rotar la pelvis manteniendo el torso quieto.'),
  (30, 'Rotación de torso', 'movilidad', 'number', '°', true, true, 45, 'Sentado o en postura, con palo en el pecho, rotar el torso sin mover la pelvis.'),
  (40, 'Sentadilla profunda con brazos arriba', 'movilidad', 'pass_fail', null, false, true, null, 'Talones apoyados, brazos sobre la cabeza, muslos por debajo de la horizontal.'),
  (50, 'Tocar la punta de los pies', 'movilidad', 'pass_fail', null, false, true, null, 'De pie, piernas extendidas, llegar con los dedos a la punta de los pies.'),
  (60, 'Rotación externa de hombro 90/90', 'movilidad', 'pass_fail', null, true, true, null, 'Brazo a 90° de abducción y codo a 90°, rotar hacia atrás hasta la vertical.'),
  (70, 'Flexión de hombro (dorsal)', 'movilidad', 'pass_fail', null, false, true, null, 'Espalda contra la pared, llevar los brazos arriba hasta tocar la pared sin arquear la zona lumbar.'),
  (80, 'Rotación interna de cadera', 'movilidad', 'number', '°', true, true, 40, 'Sentado o boca abajo, rodilla a 90°, rotar la cadera hacia adentro.'),
  (90, 'Rotación externa de cadera', 'movilidad', 'number', '°', true, true, 45, 'Sentado o boca abajo, rodilla a 90°, rotar la cadera hacia afuera.'),
  (100, 'Rotación cervical', 'movilidad', 'number', '°', true, true, 70, 'Sentado, girar la cabeza hacia cada lado sin mover los hombros.'),
  (110, 'Bisagra de muñeca (desviación radial y cubital)', 'movilidad', 'pass_fail', null, true, true, null, 'Antebrazo apoyado, mover la muñeca hacia el pulgar y hacia el meñique.'),
  (120, 'Equilibrio en un pie, ojos cerrados', 'estabilidad', 'number', 's', true, true, 20, 'Brazos cruzados en el pecho, contar hasta que apoye el otro pie o abra los ojos.'),
  (130, 'Puente con extensión de pierna', 'estabilidad', 'number', 's', true, true, 10, 'Puente de glúteos, extender una pierna y sostener sin que caiga la pelvis.'),
  (140, 'Plancha lateral', 'estabilidad', 'number', 's', true, true, 45, 'Sobre antebrazo, cuerpo alineado.'),
  (150, 'Fuerza de agarre', 'fuerza', 'number', 'kg', true, true, null, 'Dinamómetro de mano, mejor de tres intentos.'),
  (160, 'Salto vertical', 'potencia', 'number', 'cm', false, true, null, 'Contramovimiento con brazos libres, mejor de tres intentos.'),
  (170, 'Lanzamiento de balón medicinal sentado', 'potencia', 'number', 'm', false, true, null, 'Sentado contra la pared, pase de pecho con balón de 2 a 3 kg.'),
  (180, 'Lanzamiento rotacional de balón medicinal', 'potencia', 'number', 'm', true, true, null, 'En postura de golf, lanzamiento lateral con balón de 2 a 3 kg.'),
  (190, 'Velocidad de palo (driver)', 'golf', 'number', 'mph', false, true, null, 'Promedio de los mejores tres swings con radar.'),
  (200, 'Velocidad de bola (driver)', 'golf', 'number', 'mph', false, true, null, 'Promedio de los mejores tres golpes con radar o launch monitor.');
