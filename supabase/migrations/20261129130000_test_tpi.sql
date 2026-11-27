-- =====================================================================
-- Test TPI (screening de golf): el entrenador sube el reporte (PDF o
-- foto) y carga cada prueba como bien / más o menos / mal. Con eso la
-- app arma una propuesta de ejercicios correctivos que el entrenador
-- revisa y aprueba. Todo es solo del staff: el alumno no lo ve.
-- =====================================================================

create table public.tpi_screens (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  athlete_id uuid not null references public.athletes(id) on delete cascade,
  date date not null default current_date,
  notes text check (notes is null or char_length(notes) <= 2000),
  report_path text check (report_path is null or char_length(report_path) <= 300),
  report_name text check (report_name is null or char_length(report_name) <= 200),
  report_type text check (report_type is null or report_type in ('application/pdf', 'image/jpeg', 'image/png', 'image/webp')),
  workout_id uuid references public.workouts(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index tpi_screens_athlete_idx on public.tpi_screens(athlete_id, date desc);
create trigger tpi_screens_updated_at before update on public.tpi_screens
  for each row execute function public.set_updated_at();

-- test_key: clave fija de cada prueba (lista en src/lib/tpi.ts).
-- side: '-' ambos lados o prueba sin lados, 'I' solo izquierdo, 'D' solo derecho.
create table public.tpi_results (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  screen_id uuid not null references public.tpi_screens(id) on delete cascade,
  test_key text not null check (test_key ~ '^[a-z0-9_]{2,40}$'),
  rating text not null check (rating in ('bien', 'regular', 'mal')),
  side text not null default '-' check (side in ('-', 'I', 'D')),
  note text check (note is null or char_length(note) <= 300),
  unique (screen_id, test_key)
);
create index tpi_results_screen_idx on public.tpi_results(screen_id);

alter table public.tpi_screens enable row level security;
alter table public.tpi_results enable row level security;
create policy tpi_screens_staff on public.tpi_screens for all to authenticated
  using (public.is_org_staff(org_id)) with check (public.is_org_staff(org_id));
create policy tpi_results_staff on public.tpi_results for all to authenticated
  using (public.is_org_staff(org_id)) with check (public.is_org_staff(org_id));

-- Guarda un test completo (nuevo o existente) con sus resultados. p_results: [{test_key, rating, side, note}]
create or replace function public.save_tpi_screen(
  p_screen uuid, p_athlete uuid, p_date date, p_notes text,
  p_report_path text, p_report_name text, p_report_type text, p_results jsonb
) returns uuid language plpgsql security invoker set search_path = public as $$
declare v_org uuid; v_id uuid := p_screen; r jsonb;
begin
  select org_id into v_org from public.athletes where id = p_athlete;
  if v_org is null or not public.is_org_staff(v_org) then raise exception 'forbidden'; end if;
  if p_report_path is not null and split_part(p_report_path, '/', 1) <> v_org::text then raise exception 'bad_path'; end if;
  if v_id is null then
    insert into public.tpi_screens (org_id, athlete_id, date, notes, report_path, report_name, report_type)
    values (v_org, p_athlete, coalesce(p_date, current_date), nullif(trim(p_notes), ''), p_report_path, p_report_name, p_report_type)
    returning id into v_id;
  else
    update public.tpi_screens set
      date = coalesce(p_date, date),
      notes = nullif(trim(p_notes), ''),
      report_path = coalesce(p_report_path, report_path),
      report_name = case when p_report_path is null then report_name else p_report_name end,
      report_type = case when p_report_path is null then report_type else p_report_type end
    where id = v_id and athlete_id = p_athlete;
    if not found then raise exception 'not_found'; end if;
    delete from public.tpi_results where screen_id = v_id;
  end if;
  for r in select * from jsonb_array_elements(coalesce(p_results, '[]'::jsonb)) loop
    insert into public.tpi_results (org_id, screen_id, test_key, rating, side, note)
    values (v_org, v_id, r->>'test_key', r->>'rating', coalesce(nullif(r->>'side', ''), '-'), nullif(trim(r->>'note'), ''));
  end loop;
  return v_id;
end $$;

revoke execute on function public.save_tpi_screen(uuid, uuid, date, text, text, text, text, jsonb) from anon, public;
grant execute on function public.save_tpi_screen(uuid, uuid, date, text, text, text, text, jsonb) to authenticated;

-- ---------- Storage: reportes del test (privado, carpeta por organización, solo staff) ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('tpi-reports', 'tpi-reports', false, 10485760, array['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy tpi_reports_read on storage.objects for select to authenticated
  using (bucket_id = 'tpi-reports' and public.is_org_staff(public.storage_org(name)));
create policy tpi_reports_upload on storage.objects for insert to authenticated
  with check (bucket_id = 'tpi-reports' and public.is_org_staff(public.storage_org(name)));
create policy tpi_reports_remove on storage.objects for delete to authenticated
  using (bucket_id = 'tpi-reports' and public.is_org_staff(public.storage_org(name)));

-- ---------- Ejercicios correctivos que faltaban (videos probados con revisar-videos.yml) ----------
insert into public.exercises (name, category, muscle_groups, equipment, unilateral, instructions, coaching_cues, video_url)
select v.* from (values
('Basculación pélvica en postura de golf','movilidad',array['Cadera','Lumbares','Core']::text[],array['Solo peso corporal']::text[],false,'En postura de golf con los brazos cruzados en el pecho, llevá la cola hacia atrás arqueando la zona lumbar y después metela hacia adentro aplanando la espalda. Alterná despacio.','Torso y piernas quietos: se mueve solo la pelvis. Recorrido completo y sin apuro.','https://www.youtube.com/watch?v=YffbXk1Ksx8'),
('Rotación de pelvis en postura de golf','movilidad',array['Cadera','Oblicuos']::text[],array['Solo peso corporal','Palo de golf']::text[],false,'En postura de golf con un palo cruzado en el pecho, girá la cadera hacia un lado y hacia el otro dejando los hombros mirando al frente.','Hombros quietos. Rodillas con la misma flexión. Si cuesta, apoyá la espalda alta contra una pared.','https://www.youtube.com/watch?v=jAz5nMbcVWQ'),
('Sentadilla profunda con palo arriba','movilidad',array['Tobillo','Cadera','Hombros','Espalda alta']::text[],array['Palo de golf']::text[],false,'Con un palo sobre la cabeza y los brazos estirados, bajá a sentadilla profunda con los talones apoyados. Sostené dos segundos abajo y subí.','Brazos detrás de las orejas. Talones en el piso. Pecho alto. Si no llegás, poné un disco bajo los talones.','https://www.youtube.com/watch?v=yP5I3LGlZwE'),
('Toque de pies progresivo','movilidad',array['Isquiotibiales','Lumbares']::text[],array['Solo peso corporal','Barra y discos']::text[],false,'Con las puntas de los pies sobre un disco, bajá a tocar los pies con las piernas estiradas apretando una pelota o toalla entre las rodillas. Repetí con los talones sobre el disco.','Soltá la cabeza y el cuello. Llevá la cadera hacia atrás. Exhalá al bajar.','https://www.youtube.com/watch?v=BVSPXBCFXdc'),
('Rotación externa de hombro acostado','fuerza',array['Manguito rotador','Hombros']::text[],array['Mancuernas']::text[],true,'Acostado de costado con una toalla entre el codo y el cuerpo, con el codo a 90°, levantá la mancuerna girando el antebrazo hacia el techo. Bajá lento.','Codo pegado al cuerpo. Peso liviano. Bajada de tres segundos.','https://www.youtube.com/watch?v=20v3G-odF5c'),
('Estiramiento del durmiente','movilidad',array['Hombros','Manguito rotador']::text[],array['Solo peso corporal']::text[],true,'Acostado de costado sobre el hombro a estirar, con el brazo a 90° y el codo flexionado, empujá suave el antebrazo hacia el piso con la otra mano. Sostené.','Sin dolor. Hombro de abajo bien apoyado. Respirá lento.','https://www.youtube.com/watch?v=9BN8bRVq3Xo'),
('Postura del niño con elevación de brazo','movilidad',array['Espalda alta','Hombros','Dorsales']::text[],array['Solo peso corporal']::text[],true,'En postura del niño con la cola sobre los talones, apoyá una mano atrás de la cabeza y girá el pecho abriendo el codo hacia el techo. Después estirá ese brazo adelante y levantalo del piso.','La cola no se despega de los talones. Mirá hacia la mano. Sostené un segundo arriba.','https://www.youtube.com/watch?v=Foq2hMAjoOQ'),
('Retracción de mentón','activacion',array['Espalda alta']::text[],array['Solo peso corporal']::text[],false,'Sentado o de pie, con la mirada al frente, llevá el mentón hacia atrás como haciendo papada, sin bajar la cabeza. Sostené y soltá.','Cabeza derecha, no mires abajo. Hombros relajados. Movimiento chico.','https://www.youtube.com/watch?v=u8C5LgpK3r4'),
('Movilidad cervical (rotaciones)','movilidad',array['Espalda alta']::text[],array['Solo peso corporal']::text[],false,'Sentado con la espalda derecha, girá la cabeza lento hacia un lado hasta el final cómodo, volvé al centro y girá hacia el otro.','Hombros quietos. Mentón a la misma altura. Sin rebotes.','https://www.youtube.com/watch?v=LTGY5Jynslo'),
('Pronación y supinación con martillo','fuerza',array['Antebrazos']::text[],array['Mancuernas']::text[],true,'Con el antebrazo apoyado en el muslo o en un banco y el martillo en la mano, girá la palma hacia arriba y hacia abajo despacio.','Codo quieto. Tomalo más lejos de la cabeza para hacerlo más difícil.','https://www.youtube.com/watch?v=o9Mr0BVEbYo'),
('Desviación radial y cubital con martillo','fuerza',array['Antebrazos']::text[],array['Mancuernas']::text[],true,'De pie con el brazo al costado y el martillo en la mano, levantá la cabeza del martillo hacia adelante moviendo solo la muñeca. Después con el martillo hacia atrás, levantalo hacia atrás.','Brazo quieto. Movimiento lento. Es el gesto de quiebre de muñecas del swing.','https://www.youtube.com/watch?v=vTwGoc1RBKU'),
('Flexión y extensión de muñeca con mancuerna','fuerza',array['Antebrazos']::text[],array['Mancuernas']::text[],true,'Sentado con el antebrazo apoyado en el muslo y la muñeca afuera, subí y bajá la mancuerna moviendo solo la muñeca: primero con la palma hacia arriba y después hacia abajo.','Antebrazo apoyado todo el tiempo. Peso liviano. Recorrido completo.','https://www.youtube.com/watch?v=04u4uGk3Ia8')
) as v(name, category, muscle_groups, equipment, unilateral, instructions, coaching_cues, video_url)
where not exists (select 1 from public.exercises e where e.org_id is null and lower(e.name) = lower(v.name));
