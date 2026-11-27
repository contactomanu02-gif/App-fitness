-- =====================================================================
-- Etiquetas de rutinas (momento de la temporada, nivel, lugar, deporte)
-- para encontrar rápido la plantilla justa entre muchas.
-- Valores fijos definidos en src/lib/routine-tags.ts.
-- =====================================================================

alter table public.programs add column tags text[] not null default '{}';
alter table public.workouts add column tags text[] not null default '{}';

-- Las copias conservan las etiquetas.
create or replace function public.copy_workout(
  p_workout uuid, p_program uuid, p_block uuid, p_week smallint, p_day smallint, p_name text default null
) returns uuid language plpgsql security invoker set search_path = public as $$
declare v_src public.workouts; v_new uuid;
begin
  select * into v_src from public.workouts where id = p_workout;
  if not found or not public.is_org_staff(v_src.org_id) then raise exception 'forbidden'; end if;
  insert into public.workouts (org_id, program_id, block_id, week_index, day_index, name, goal, est_duration_min, intensity_pct, focus, tags, notes, sort_order)
  values (v_src.org_id, p_program, p_block, p_week, p_day, coalesce(p_name, v_src.name), v_src.goal, v_src.est_duration_min, v_src.intensity_pct, v_src.focus, v_src.tags, v_src.notes, v_src.sort_order)
  returning id into v_new;
  insert into public.workout_items (workout_id, org_id, exercise_id, sort_order, group_label, sets, reps, load, rest_sec, tempo, rpe, notes)
  select v_new, org_id, exercise_id, sort_order, group_label, sets, reps, load, rest_sec, tempo, rpe, notes
  from public.workout_items where workout_id = p_workout;
  return v_new;
end $$;

create or replace function public.copy_program(p_program uuid, p_athlete uuid default null, p_name text default null)
returns uuid language plpgsql security invoker set search_path = public as $$
declare
  v_src public.programs; v_new uuid; v_block record; v_new_block uuid; v_w record;
begin
  select * into v_src from public.programs where id = p_program;
  if not found or not public.is_org_staff(v_src.org_id) then raise exception 'forbidden'; end if;
  insert into public.programs (org_id, athlete_id, name, goal, description, tags, status, source, source_program_id)
  values (v_src.org_id, p_athlete, coalesce(p_name, v_src.name), v_src.goal, v_src.description, v_src.tags, 'draft', v_src.source, v_src.id)
  returning id into v_new;
  for v_block in select * from public.program_blocks where program_id = p_program order by sort_order loop
    insert into public.program_blocks (program_id, org_id, name, goal, weeks, sort_order)
    values (v_new, v_block.org_id, v_block.name, v_block.goal, v_block.weeks, v_block.sort_order)
    returning id into v_new_block;
    for v_w in select id, week_index, day_index from public.workouts where block_id = v_block.id loop
      perform public.copy_workout(v_w.id, v_new, v_new_block, v_w.week_index, v_w.day_index);
    end loop;
  end loop;
  return v_new;
end $$;

-- Ejercicios nuevos para dar más variedad a la zona media (abdominales y espinales),
-- más máquinas y poleas, y trabajo de velocidad y cambio de dirección para deportes de campo.
-- Videos probados con revisar-videos.yml.
insert into public.exercises (name, category, muscle_groups, equipment, unilateral, instructions, coaching_cues, video_url)
select v.* from (values
('Elevación de piernas acostado','core',array['Core']::text[],array['Solo peso corporal']::text[],false,'Boca arriba con las manos debajo de la cola, subí las piernas estiradas hasta que apunten al techo y bajalas lento sin apoyarlas.','Zona lumbar pegada al piso. Bajá despacio. Si cuesta, flexioná un poco las rodillas.','https://www.youtube.com/watch?v=bz-sVK8jHgE'),
('Abdominal bicicleta','core',array['Core','Oblicuos']::text[],array['Solo peso corporal']::text[],false,'Boca arriba con las manos en la nuca, llevá un codo hacia la rodilla contraria mientras estirás la otra pierna, y alterná como pedaleando.','Girá desde el tronco, no tires del cuello. Movimiento controlado. Contá cada lado.','https://www.youtube.com/watch?v=dYxamPVcKvk'),
('Abdominal en V','core',array['Core']::text[],array['Solo peso corporal']::text[],false,'Acostado con brazos y piernas estirados, subí al mismo tiempo tronco y piernas hasta tocar los pies con las manos y bajá controlado.','Espalda larga. Soltá el aire al subir. Si cuesta, flexioná las rodillas.','https://www.youtube.com/watch?v=xUsHyWZGm0w'),
('Abdominal inverso','core',array['Core']::text[],array['Solo peso corporal']::text[],false,'Boca arriba con las rodillas flexionadas en el aire, llevá las rodillas hacia el pecho despegando la cola del piso y bajá lento.','Sin impulso. La cola se despega poco. Bajada lenta.','https://www.youtube.com/watch?v=wg59Dej-4sk'),
('Abdominal en polea de rodillas','core',array['Core']::text[],array['Poleas']::text[],false,'De rodillas frente a la polea alta con la soga a los costados de la cabeza, enrollá el tronco llevando los codos hacia los muslos y volvé.','La cadera queda quieta. Enrollá la columna. Peso moderado.','https://www.youtube.com/watch?v=LsuqpN04CJ0'),
('Toques de talón','core',array['Oblicuos','Core']::text[],array['Solo peso corporal']::text[],false,'Boca arriba con las rodillas flexionadas y los hombros despegados, inclinate de lado a lado tocando cada talón con la mano.','Hombros despegados todo el tiempo. Movimiento corto y rápido. Contá cada lado.','https://www.youtube.com/watch?v=PmD8OjgsdrY'),
('Plancha con toque de hombros','core',array['Core','Hombros']::text[],array['Solo peso corporal']::text[],false,'En plancha con brazos estirados, tocá el hombro contrario con una mano y después con la otra sin mover la cadera.','Pies separados. Cadera quieta. Toques lentos.','https://www.youtube.com/watch?v=7o-EHYhFcl8'),
('Nadador boca abajo','core',array['Lumbares','Espalda alta','Glúteos']::text[],array['Solo peso corporal']::text[],false,'Boca abajo con brazos y piernas estirados, despegá brazos y piernas y movelos alternados como si nadaras.','Mirada al piso. Movimiento corto. Glúteos firmes.','https://www.youtube.com/watch?v=MKhtx7NlkQU'),
('Buenos días con barra','fuerza',array['Isquiotibiales','Glúteos','Lumbares']::text[],array['Barra y discos','Rack']::text[],false,'Con la barra en la espalda alta y las rodillas apenas flexionadas, llevá la cadera atrás inclinando el tronco con la espalda recta y volvé a subir.','Espalda neutra. La cadera va atrás. Peso liviano a moderado.','https://www.youtube.com/watch?v=3QTVbkT30E0'),
('Sentadilla en máquina Smith','fuerza',array['Cuádriceps','Glúteos']::text[],array['Máquinas de gimnasio']::text[],false,'Con la barra guiada en la espalda alta y los pies un poco adelantados, bajá hasta que los muslos queden paralelos al piso y subí.','Pies apenas adelante. Rodillas en la línea de los pies. Espalda apoyada en la barra.','https://www.youtube.com/watch?v=4r9o_rqFZX4'),
('Abducción en máquina','fuerza',array['Glúteos','Cadera']::text[],array['Máquinas de gimnasio']::text[],false,'Sentado en la máquina con las almohadillas por fuera de las rodillas, abrí las piernas y volvé lento.','Espalda apoyada. Pausa al abrir. Volvé sin golpear el peso.','https://www.youtube.com/watch?v=UlBwFUhiIqA'),
('Tirón entre piernas en polea','fuerza',array['Glúteos','Isquiotibiales']::text[],array['Poleas']::text[],false,'De espaldas a la polea baja con la soga entre las piernas, llevá la cadera atrás y extendela con fuerza hasta quedar erguido.','Bisagra de cadera. Brazos largos y relajados. Apretá glúteos arriba.','https://www.youtube.com/watch?v=i04NloqHYBE'),
('Aperturas en máquina','fuerza',array['Pectorales']::text[],array['Máquinas de gimnasio']::text[],false,'Sentado en la máquina con los brazos abiertos, juntá las manos adelante del pecho y volvé lento.','Codos apenas flexionados. Pecho alto. Volvé hasta sentir el estiramiento.','https://www.youtube.com/watch?v=NfQJyaxAJX8'),
('Remo en máquina','fuerza',array['Dorsales','Espalda alta','Bíceps']::text[],array['Máquinas de gimnasio']::text[],false,'Sentado con el pecho apoyado, tirá de las manijas hacia el cuerpo juntando los omóplatos y volvé controlado.','Pecho pegado al apoyo. Codos atrás. Pausa de 1 segundo.','https://www.youtube.com/watch?v=rGeBwjJC8nU'),
('Prensa a una pierna','fuerza',array['Cuádriceps','Glúteos']::text[],array['Máquinas de gimnasio']::text[],true,'En la prensa con un solo pie en el centro de la plataforma, bajá hasta 90° de rodilla y empujá. Cambiá de pierna.','Rodilla alineada con el pie. Cola apoyada. Menos peso que con dos piernas.','https://www.youtube.com/watch?v=3xkBweqGolg'),
('Desplazamiento lateral','velocidad',array['Aductores','Glúteos','Cuádriceps']::text[],array['Solo peso corporal']::text[],false,'En posición atlética, desplazate de costado con pasos rápidos sin juntar ni cruzar los pies, ida y vuelta.','Cadera baja. Pies sin cruzar. Frená firme con la pierna de afuera.','https://www.youtube.com/watch?v=mziPKITnPeQ'),
('Cambio de dirección 5-10-5','velocidad',array['Cuerpo completo']::text[],array['Solo peso corporal']::text[],false,'Con tres conos a 5 metros, salí hacia un lado 5 metros, tocá la línea, volvé 10 metros al otro lado y terminá 5 metros en el centro.','Bajá la cadera antes de frenar. Tocá la línea con la mano. Máxima velocidad.','https://www.youtube.com/watch?v=SBx-chygCdE'),
('Sprint de 10 metros','velocidad',array['Cuerpo completo','Glúteos','Isquiotibiales']::text[],array['Solo peso corporal']::text[],false,'Desde parado, acelerá al máximo durante 10 metros y frená de a poco. Volvé caminando.','Cuerpo inclinado adelante al salir. Brazos fuertes. Descansá completo entre repeticiones.','https://www.youtube.com/watch?v=8NktIFu8aQM')
) as v(name, category, muscle_groups, equipment, unilateral, instructions, coaching_cues, video_url)
where not exists (select 1 from public.exercises e where e.org_id is null and lower(e.name) = lower(v.name));
