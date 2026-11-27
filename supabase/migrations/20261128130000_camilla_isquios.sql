-- Camilla de isquiotibiales para las rutinas con máquinas (pedido de Manu, 2026-11-27).
insert into public.exercises (name, category, muscle_groups, equipment, unilateral, instructions, coaching_cues, video_url)
select 'Camilla de isquiotibiales', 'fuerza', array['Isquiotibiales']::text[], array['Máquinas de gimnasio']::text[], false,
  'Acostado boca abajo en la camilla, con el rodillo apoyado arriba de los talones, flexioná las rodillas llevando los talones hacia los glúteos y bajá lento.',
  'Cadera pegada a la camilla. Sin impulso. Bajada en 2 o 3 segundos.',
  'https://www.youtube.com/watch?v=OYoW4IzWdrw'
where not exists (select 1 from public.exercises e where e.org_id is null and lower(e.name) = 'camilla de isquiotibiales');
