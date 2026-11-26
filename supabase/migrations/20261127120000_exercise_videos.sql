-- =====================================================================
-- Videos para los ejercicios del catálogo (tutoriales públicos de YouTube,
-- elegidos por título; el entrenador puede reemplazar cualquiera por el suyo)
-- y video propio por espacio para un ejercicio del catálogo.
-- =====================================================================

update public.exercises e set video_url = v.url
from (values
  ('Activación escapular en pared', 'https://www.youtube.com/watch?v=Twmrgq6ywTU'),
  ('Almeja con banda', 'https://www.youtube.com/watch?v=u2p6nH7WEhE'),
  ('Caminata lateral con banda', 'https://www.youtube.com/watch?v=YHOCvSx8itM'),
  ('Extensión de cadera en cuadrupedia', 'https://www.youtube.com/watch?v=aHqnljHrvYo'),
  ('Respiración 90/90 con globo o inflado', 'https://www.youtube.com/watch?v=beMtnSOrt5s'),
  ('Rotación externa de hombro con banda', 'https://www.youtube.com/watch?v=vBTl2e-hSd4'),
  ('Y-T-W en banco inclinado', 'https://www.youtube.com/watch?v=hhmhErRhjco'),
  ('Bird dog', 'https://www.youtube.com/watch?v=4pGRt8aLH7I'),
  ('Dead bug', 'https://www.youtube.com/watch?v=XkTtXA3-IqU'),
  ('Leñador con cable (alto a bajo)', 'https://www.youtube.com/watch?v=BEgusW-p_vc'),
  ('Leñador inverso (bajo a alto)', 'https://www.youtube.com/watch?v=dnadAhl4X9E'),
  ('Paseo de maleta', 'https://www.youtube.com/watch?v=58zoUXlwDRM'),
  ('Plancha con arrastre de pesa', 'https://www.youtube.com/watch?v=hMSt1LmaSTA'),
  ('Plancha frontal', 'https://www.youtube.com/watch?v=sG5SaIAz9wk'),
  ('Plancha lateral', 'https://www.youtube.com/watch?v=kyOeSuh7LLo'),
  ('Press Pallof', 'https://www.youtube.com/watch?v=LWrUioYVcZ0'),
  ('Press Pallof en semi-arrodillado', 'https://www.youtube.com/watch?v=CRHHSmoakC8'),
  ('Rotación rusa con balón', 'https://www.youtube.com/watch?v=NSCbldIsXeI'),
  ('Rueda abdominal', 'https://www.youtube.com/watch?v=0JzHapbZnfQ'),
  ('Equilibrio a una pierna con alcance', 'https://www.youtube.com/watch?v=I89TENCqzxQ'),
  ('Postura de golf a una pierna', 'https://www.youtube.com/watch?v=lpUzMqeS9OM'),
  ('Sentadilla a una pierna al cajón', 'https://www.youtube.com/watch?v=VdzU23Twz1A'),
  ('Aducción en banco (Copenhague)', 'https://www.youtube.com/watch?v=DpXug2f7K08'),
  ('Curl de muñeca y pronosupinación', 'https://www.youtube.com/watch?v=RjHOuDn5i-4'),
  ('Curl nórdico', 'https://www.youtube.com/watch?v=_Rpgnt55_-o'),
  ('Dominadas', 'https://www.youtube.com/watch?v=8mhDd9Ahl1M'),
  ('Elevación de talones', 'https://www.youtube.com/watch?v=0guUs90hUiY'),
  ('Face pull', 'https://www.youtube.com/watch?v=BwFDZGcM0Hc'),
  ('Flexiones de brazos', 'https://www.youtube.com/watch?v=5Mirxt72nLw'),
  ('Hip thrust', 'https://www.youtube.com/watch?v=vOuz3pUWU0Y'),
  ('Jalón al pecho', 'https://www.youtube.com/watch?v=eSlKErmf5WU'),
  ('Paseo del granjero', 'https://www.youtube.com/watch?v=69hTPgHwA08'),
  ('Peso muerto con barra hexagonal', 'https://www.youtube.com/watch?v=ngwEa50dG00'),
  ('Peso muerto convencional', 'https://www.youtube.com/watch?v=44iTFW8f2HE'),
  ('Peso muerto rumano', 'https://www.youtube.com/watch?v=O-MLxyVYRBY'),
  ('Peso muerto rumano a una pierna', 'https://www.youtube.com/watch?v=u8g_1Q_E8G4'),
  ('Press de banca', 'https://www.youtube.com/watch?v=FMpwElqKC6Q'),
  ('Press de banca con mancuernas', 'https://www.youtube.com/watch?v=uii5wbbN99w'),
  ('Press de hombros con mancuernas', 'https://www.youtube.com/watch?v=96xeqjYXkT4'),
  ('Press landmine a un brazo', 'https://www.youtube.com/watch?v=Cidr2pbu7Dw'),
  ('Puente de glúteo a una pierna', 'https://www.youtube.com/watch?v=gKuMm9LpA10'),
  ('Remo con mancuerna a una mano', 'https://www.youtube.com/watch?v=2-MNPKxwfcE'),
  ('Remo invertido en suspensión', 'https://www.youtube.com/watch?v=SSzfRQ-IwVE'),
  ('Sentadilla búlgara', 'https://www.youtube.com/watch?v=QTgGgN3ymu8'),
  ('Sentadilla frontal', 'https://www.youtube.com/watch?v=yyIpwHq_eE8'),
  ('Sentadilla trasera con barra', 'https://www.youtube.com/watch?v=9D7zI27gFHM'),
  ('Step-up al cajón', 'https://www.youtube.com/watch?v=E88WpLYnnSk'),
  ('Zancada caminando', 'https://www.youtube.com/watch?v=18FPCJOfNb4'),
  ('Zancada lateral', 'https://www.youtube.com/watch?v=Ix7dmC6PHWU'),
  ('Disociación de cadera y tronco', 'https://www.youtube.com/watch?v=xzEosGAaW20'),
  ('Estiramiento de dorsal en banco', 'https://www.youtube.com/watch?v=V57t3gbD8wo'),
  ('Estiramiento del flexor de cadera', 'https://www.youtube.com/watch?v=HmfHMdmmVhc'),
  ('Gato-camello', 'https://www.youtube.com/watch?v=EeGZCFmRGQQ'),
  ('Movilidad de hombro con palo (dislocaciones)', 'https://www.youtube.com/watch?v=EYhNOZ7pH-w'),
  ('Movilidad de tobillo en pared', 'https://www.youtube.com/watch?v=DkKpTBlx-ME'),
  ('Open book (libro abierto)', 'https://www.youtube.com/watch?v=rDviWORCWEw'),
  ('Rotación con palo en postura de golf', 'https://www.youtube.com/watch?v=-MOR-VsdRSc'),
  ('Rotación de cadera 90/90', 'https://www.youtube.com/watch?v=Q9nsLkpokn4'),
  ('Rotación interna de cadera en cuadrupedia', 'https://www.youtube.com/watch?v=X47XBu4duTI'),
  ('Rotación torácica en cuadrupedia', 'https://www.youtube.com/watch?v=iWxGRsCGURM'),
  ('Rotación torácica sentado con palo', 'https://www.youtube.com/watch?v=NhgNGmyWy14'),
  ('Sentadilla profunda con apertura', 'https://www.youtube.com/watch?v=8vr34bjtYsA'),
  ('World''s greatest stretch', 'https://www.youtube.com/watch?v=ElbQE69lMXE'),
  ('Cargada de potencia con mancuerna', 'https://www.youtube.com/watch?v=Wq-4jyPF1MM'),
  ('Jump squat con carga liviana', 'https://www.youtube.com/watch?v=aTTq2YABlb0'),
  ('Lanzamiento frontal de pecho con balón', 'https://www.youtube.com/watch?v=OyM6-iktljE'),
  ('Lanzamiento por encima de la cabeza hacia atrás', 'https://www.youtube.com/watch?v=j2iNY9aLmys'),
  ('Lanzamiento rotacional de balón medicinal', 'https://www.youtube.com/watch?v=o9BC7lgN1bo'),
  ('Lanzamiento rotacional en posición de golf', 'https://www.youtube.com/watch?v=wfYek3bcDO0'),
  ('Press de pecho explosivo en polea', 'https://www.youtube.com/watch?v=mWM_acc2uFY'),
  ('Rotación explosiva con cable', 'https://www.youtube.com/watch?v=R-yu0RjMW-k'),
  ('Salto al cajón', 'https://www.youtube.com/watch?v=c-Yonc6lzUs'),
  ('Salto con contramovimiento', 'https://www.youtube.com/watch?v=K-Puahl_o74'),
  ('Salto lateral (skater)', 'https://www.youtube.com/watch?v=8fAogMVW-to'),
  ('Slam de balón medicinal', 'https://www.youtube.com/watch?v=RzRJ1_zit-c'),
  ('Swing con kettlebell', 'https://www.youtube.com/watch?v=njsTlHiI2BE'),
  ('Sentadilla goblet', 'https://www.youtube.com/watch?v=5HHITKuLxUs')
) as v(name, url)
where e.org_id is null and e.name = v.name;

-- Video propio de un espacio para un ejercicio del catálogo (sin duplicarlo).
create table public.exercise_video_overrides (
  org_id uuid not null references public.organizations(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  video_url text not null check (char_length(video_url) <= 500),
  updated_at timestamptz not null default now(),
  primary key (org_id, exercise_id)
);
alter table public.exercise_video_overrides enable row level security;

create policy exercise_video_overrides_select on public.exercise_video_overrides for select to authenticated
  using (public.is_org_member(org_id));
create policy exercise_video_overrides_write on public.exercise_video_overrides for all to authenticated
  using (public.is_org_staff(org_id)) with check (public.is_org_staff(org_id));
