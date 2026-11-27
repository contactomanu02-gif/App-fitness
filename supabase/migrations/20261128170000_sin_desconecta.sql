-- Manu sacó «Desconectá». En los meses ya cargados se reemplaza por otro hábito.
do $$
declare
  r record;
  t record;
begin
  for r in
    delete from public.challenges
    where template_key = 'sin-pantallas' and month >= '2026-11-01'
    returning org_id, month, sort_order
  loop
    for t in
      select * from (values
        (2, 'colores', 'Comé colores', 'Frutas y verduras en tus comidas: energía y recuperación.', 'leaf', 100,
         '[{"text":"Fruta o verdura en almuerzo y cena","times":20}]'),
        (3, 'sin-gaseosas', 'Sin gaseosas', 'Agua en lugar de gaseosas y jugos azucarados.', 'water', 100,
         '[{"text":"Un día entero sin gaseosas ni jugos con azúcar","times":20}]'),
        (4, 'tu-deporte', 'Más horas de tu deporte', 'Lo que entrenás en el gimnasio se aprovecha jugando. Sumá práctica fuera del gimnasio.', 'target', 150,
         '[{"text":"Practicar o jugar tu deporte 1 hora","times":6},{"text":"Practicar o jugar tu deporte 2 horas","times":3}]'),
        (5, 'agua', 'Bien hidratado', 'Tomá al menos 2 litros de agua en el día. Llevá una botella con vos.', 'water', 100,
         '[{"text":"Tomar 2 litros de agua en el día","times":20}]'),
        (6, 'dormir', 'Dormí 8 horas', 'El descanso es parte del entrenamiento. Marcá los días que dormiste 8 horas o más.', 'moon', 100,
         '[{"text":"Dormir 8 horas o más","times":15}]')
      ) as v(ord, k, title, descr, icon, pts, steps)
      where not exists (select 1 from public.challenges c where c.org_id = r.org_id and c.month = r.month and c.template_key = v.k)
      order by ord
      limit 1
    loop
      insert into public.challenges (org_id, month, title, description, icon, steps, points, sort_order, template_key)
      values (r.org_id, r.month, t.title, t.descr, t.icon, t.steps::jsonb, t.pts, r.sort_order, t.k);
    end loop;
  end loop;
end $$;
