-- Videos de YouTube que usa la app de verdad (catálogo, ejercicios propios y videos propios del entrenador).
select coalesce(json_agg(distinct m[1]), '[]'::json) as ids
from (
  select video_url as u from public.exercises where video_url is not null
  union select video_url from public.exercise_video_overrides
) v,
lateral regexp_matches(v.u, '(?:youtube\.com/watch\?v=|youtu\.be/|youtube\.com/shorts/|youtube\.com/embed/|youtube-nocookie\.com/embed/)([A-Za-z0-9_-]{11})') m;
