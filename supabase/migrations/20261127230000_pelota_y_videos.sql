-- Pedido de Manu (2026-11-27): «balón» → «pelota» y videos para los 7 ejercicios que faltaban.

-- Nombres (catálogo y ejercicios propios de cada entrenador)
update public.exercises e set name = replace(replace(e.name, 'balón', 'pelota'), 'Balón', 'Pelota')
where (e.name like '%balón%' or e.name like '%Balón%')
  and not exists (
    select 1 from public.exercises x
    where x.id <> e.id and x.org_id is not distinct from e.org_id
      and lower(x.name) = lower(replace(replace(e.name, 'balón', 'pelota'), 'Balón', 'Pelota'))
  );

-- Elemento «Balón medicinal» → «Pelota medicinal» (ejercicios y lo que tiene cada alumno)
update public.exercises set equipment = array_replace(equipment, 'Balón medicinal', 'Pelota medicinal')
where 'Balón medicinal' = any(equipment);
update public.athletes set equipment = array_replace(equipment, 'Balón medicinal', 'Pelota medicinal')
where 'Balón medicinal' = any(equipment);

-- Videos (probados con revisar-videos.yml)
update public.exercises e set video_url = v.url
from (values
  ('Desaceleración rotacional con pelota', 'https://www.youtube.com/watch?v=sPysDhT1ZOM'),
  ('Extensión de hombro con mancuerna', 'https://www.youtube.com/watch?v=EXtPKfoRmtg'),
  ('Lanzamiento rotacional alto en diagonal', 'https://www.youtube.com/watch?v=l0yoDuqnQKA'),
  ('Lanzamiento rotacional con pausa', 'https://www.youtube.com/watch?v=9OvtUBU3Iec'),
  ('Lanzamiento rotacional en contra del swing', 'https://www.youtube.com/watch?v=2IBj2r0wd0Y'),
  ('Salto en dos tiempos', 'https://www.youtube.com/watch?v=sxuA3dvVpHA'),
  ('Swings con palo invertido', 'https://www.youtube.com/watch?v=B1RYmZD7xRs')
) as v(nombre, url)
where e.org_id is null and e.name = v.nombre and (e.video_url is null or e.video_url = '');
