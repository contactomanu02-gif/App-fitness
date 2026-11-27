-- Manu sacó «Al agua», «Por la escalera» y «Sumá pasos» de la biblioteca de desafíos.
-- Se quitan de los meses ya cargados (desde noviembre 2026) y, donde faltó un cardio, entra «De la cinta al trote».
with gone as (
  delete from public.challenges
  where template_key in ('pileta', 'escaleras', 'pasos') and month >= '2026-11-01'
  returning org_id, month, sort_order
)
insert into public.challenges (org_id, month, title, description, icon, steps, points, sort_order, template_key)
select distinct on (g.org_id, g.month) g.org_id, g.month, 'De la cinta al trote',
  'Arrancás caminando y terminás trotando. Cada etapa se habilita cuando completás la anterior.', 'run',
  '[{"text":"Caminar 10 min en cinta a paso rápido","times":5},{"text":"Trotar 20 min a ritmo cómodo","times":3},{"text":"Caminar 10 min en cinta con pendiente 8","times":3},{"text":"Trotar 30 min sin parar","times":2}]'::jsonb,
  150, g.sort_order, 'cinta-a-trote'
from gone g
where not exists (select 1 from public.challenges c where c.org_id = g.org_id and c.month = g.month and c.template_key = 'cinta-a-trote');
