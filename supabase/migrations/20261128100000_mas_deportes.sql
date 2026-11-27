-- Más deportes para el registro y la ficha: fútbol, tenis, rugby, polo y "Otro deporte".
-- Cada deporte trae sus propios datos; los de golf (handicap, etc.) solo aparecen si el deporte es golf.

create or replace function pg_temp.add_sport(p_slug text, p_name text, p_fields jsonb)
returns void language plpgsql as $$
declare v_id uuid;
begin
  select id into v_id from public.sports where slug = p_slug and org_id is null;
  if v_id is null then
    insert into public.sports (slug, name) values (p_slug, p_name) returning id into v_id;
  end if;
  insert into public.sport_fields (sport_id, key, label, field_type, unit, options, sort_order)
  select v_id, f->>'key', f->>'label', f->>'type', f->>'unit', coalesce(f->'options', '[]'::jsonb), (ord)::int
  from jsonb_array_elements(p_fields) with ordinality as t(f, ord)
  on conflict (sport_id, key) do nothing;
end $$;

select pg_temp.add_sport('futbol', 'Fútbol', '[
  {"key":"posicion","label":"Posición","type":"select","options":["Arquero","Defensor","Mediocampista","Delantero"]},
  {"key":"pierna_habil","label":"Pierna hábil","type":"select","options":["Derecha","Izquierda","Ambas"]},
  {"key":"club","label":"Club o equipo","type":"text"},
  {"key":"frecuencia_practica","label":"Entrenamientos con el equipo","type":"number","unit":"por semana"},
  {"key":"objetivos_rendimiento","label":"Objetivos en el fútbol","type":"long_text"}
]'::jsonb);

select pg_temp.add_sport('tenis', 'Tenis', '[
  {"key":"mano_dominante","label":"Mano dominante","type":"select","options":["Diestro","Zurdo"]},
  {"key":"reves","label":"Revés","type":"select","options":["A una mano","A dos manos"]},
  {"key":"ranking","label":"Ranking o categoría","type":"text"},
  {"key":"frecuencia_practica","label":"Frecuencia de práctica","type":"number","unit":"días por semana"},
  {"key":"objetivos_rendimiento","label":"Objetivos en el tenis","type":"long_text"}
]'::jsonb);

select pg_temp.add_sport('rugby', 'Rugby', '[
  {"key":"posicion","label":"Puesto","type":"select","options":["Pilar","Hooker","Segunda línea","Ala","Octavo","Medio scrum","Apertura","Centro","Wing","Fullback"]},
  {"key":"club","label":"Club o equipo","type":"text"},
  {"key":"frecuencia_practica","label":"Entrenamientos con el equipo","type":"number","unit":"por semana"},
  {"key":"objetivos_rendimiento","label":"Objetivos en el rugby","type":"long_text"}
]'::jsonb);

select pg_temp.add_sport('polo', 'Polo', '[
  {"key":"handicap","label":"Handicap","type":"number"},
  {"key":"posicion","label":"Puesto","type":"select","options":["1","2","3","4 (back)"]},
  {"key":"mano_dominante","label":"Mano dominante","type":"select","options":["Diestro","Zurdo"]},
  {"key":"frecuencia_practica","label":"Prácticas a caballo","type":"number","unit":"por semana"},
  {"key":"objetivos_rendimiento","label":"Objetivos en el polo","type":"long_text"}
]'::jsonb);

select pg_temp.add_sport('otro', 'Otro deporte', '[
  {"key":"cual","label":"¿Qué deporte?","type":"text"},
  {"key":"frecuencia_practica","label":"Frecuencia de práctica","type":"number","unit":"días por semana"},
  {"key":"objetivos_rendimiento","label":"Objetivos en tu deporte","type":"long_text"}
]'::jsonb);

-- Orden en el registro: golf primero, después alfabético, y al final "Otro deporte" y "Preparación física general".
create or replace function public.get_join_info(p_code text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'org_name', o.name,
    'sports', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', s.id, 'name', s.name, 'slug', s.slug,
        'fields', coalesce((select jsonb_agg(jsonb_build_object('key', f.key, 'label', f.label, 'field_type', f.field_type, 'unit', f.unit, 'options', f.options, 'sort_order', f.sort_order) order by f.sort_order)
                            from public.sport_fields f where f.sport_id = s.id), '[]'::jsonb)
      ) order by (s.slug = 'golf') desc, (s.slug in ('otro', 'general')) asc, (s.slug = 'general') asc, s.name)
      from public.sports s where s.org_id is null or s.org_id = o.id), '[]'::jsonb)
  )
  from public.organizations o where o.join_code = upper(trim(p_code))
$$;
grant execute on function public.get_join_info(text) to anon, authenticated;
