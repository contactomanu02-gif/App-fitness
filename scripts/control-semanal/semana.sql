-- Control semanal: revisa que la semana que viene (lunes a domingo) esté bien armada,
-- que los avisos al celular hayan corrido y cuánto espacio usa el plan gratis.
-- Devuelve SOLO cantidades (el repositorio es público: nunca nombres ni datos personales).
with
hoy as (select (now() at time zone 'America/Argentina/Buenos_Aires')::date as d),
semana as (select d + 1 as desde, d + 7 as hasta from hoy),
activos as (select id, user_id from public.athletes where status = 'active'),
prox as (
  select sw.*, extract(isodow from sw.date)::int as dow
  from public.scheduled_workouts sw
  join activos a on a.id = sw.athlete_id, semana s
  where sw.date between s.desde and s.hasta
),
entrenando as ( -- alumnos con sesiones en las últimas 4 semanas (están con una planificación)
  select distinct sw.athlete_id from public.scheduled_workouts sw join activos a on a.id = sw.athlete_id, hoy
  where sw.date between hoy.d - 28 and hoy.d
),
ultima as (
  select sw.athlete_id, max(sw.date) as ultima from public.scheduled_workouts sw
  join activos a on a.id = sw.athlete_id group by sw.athlete_id
)
select json_build_object(
  'semana_desde', (select desde from semana),
  'semana_hasta', (select hasta from semana),
  'alumnos_activos', (select count(*) from activos),
  'sesiones_semana', (select count(*) from prox),
  'alumnos_con_sesiones', (select count(distinct athlete_id) from prox),
  -- Venían entrenando y la semana que viene no tienen nada.
  'sin_sesiones', (select count(*) from entrenando e where not exists (select 1 from prox p where p.athlete_id = e.athlete_id)),
  -- La planificación se les termina en las próximas 2 semanas.
  'termina_pronto', (select count(*) from ultima u, hoy where u.ultima between hoy.d + 1 and hoy.d + 14),
  -- Sesiones sin ningún ejercicio.
  'sesiones_vacias', (select count(*) from prox p where not exists (select 1 from public.workout_items wi where wi.workout_id = p.workout_id)),
  -- Sesiones en un día que el alumno no entrena (según su ficha).
  'fuera_de_dias', (select count(*) from prox p where cardinality(public.athlete_weekdays(p.athlete_id)) > 0
                      and not (p.dow::smallint = any(public.athlete_weekdays(p.athlete_id)))),
  -- Dos sesiones el mismo día para el mismo alumno.
  'dobles', (select count(*) from (select athlete_id, date from prox group by 1, 2 having count(*) > 1) x),
  'dobles_dias', (select coalesce(string_agg(to_char(date, 'DD/MM'), ', ' order by date), '') from
      (select distinct date from (select athlete_id, date from prox group by 1, 2 having count(*) > 1) x) y),
  -- Sesiones el mismo día de una competencia (solo para saberlo).
  'en_competencia', (select count(*) from prox p where exists (
      select 1 from public.calendar_events ce where ce.athlete_id = p.athlete_id and ce.kind = 'torneo'
        and p.date between ce.start_date and ce.end_date)),
  'competencias_semana', (select count(*) from public.calendar_events ce join activos a on a.id = ce.athlete_id, semana s
      where ce.kind = 'torneo' and ce.start_date <= s.hasta and ce.end_date >= s.desde),
  -- Alumnos con sesiones la semana que viene que todavía no tienen cuenta (no las van a ver).
  'sin_cuenta', (select count(distinct p.athlete_id) from prox p join activos a on a.id = p.athlete_id where a.user_id is null),
  -- Avisos al celular (últimos 7 días).
  'avisos_diarios_ok', (select count(*) from cron.job_run_details d join cron.job j on j.jobid = d.jobid
      where j.jobname = 'avisos-diarios' and d.start_time > now() - interval '7 days' and d.status = 'succeeded'),
  'avisos_diarios_mal', (select count(*) from cron.job_run_details d join cron.job j on j.jobid = d.jobid
      where j.jobname = 'avisos-diarios' and d.start_time > now() - interval '7 days' and d.status = 'failed'),
  'recordatorios_ok', (select count(*) from cron.job_run_details d join cron.job j on j.jobid = d.jobid
      where j.jobname = 'recordatorio-pendientes' and d.start_time > now() - interval '7 days' and d.status = 'succeeded'),
  'recordatorios_mal', (select count(*) from cron.job_run_details d join cron.job j on j.jobid = d.jobid
      where j.jobname = 'recordatorio-pendientes' and d.start_time > now() - interval '7 days' and d.status = 'failed'),
  'horas_ultimo_aviso_diario', (select round(extract(epoch from now() - max(d.start_time)) / 3600) from cron.job_run_details d
      join cron.job j on j.jobid = d.jobid where j.jobname = 'avisos-diarios' and d.status = 'succeeded'),
  'horas_ultimo_recordatorio', (select round(extract(epoch from now() - max(d.start_time)) / 3600) from cron.job_run_details d
      join cron.job j on j.jobid = d.jobid where j.jobname = 'recordatorio-pendientes' and d.status = 'succeeded'),
  'tareas_avisos_activas', (select count(*) from cron.job where jobname in ('avisos-diarios', 'recordatorio-pendientes') and active),
  'celulares_con_avisos', (select count(*) from public.push_subscriptions),
  -- Espacio usado (plan gratis: base 500 MB, archivos 1 GB).
  'base_mb', (select round(pg_database_size(current_database()) / 1048576.0, 1)),
  'archivos_mb', (select round(coalesce(sum((metadata->>'size')::bigint), 0) / 1048576.0, 1) from storage.objects)
) as r;
