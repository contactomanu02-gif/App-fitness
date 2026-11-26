-- =====================================================================
-- Biblioteca de ejercicios: catálogo global + ejercicios propios de cada
-- entrenador, con fotos (Storage privado) y video enlazado (YouTube/Vimeo).
-- =====================================================================

create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organizations(id) on delete cascade, -- null = catálogo global
  name text not null check (char_length(name) between 2 and 120),
  category text not null check (category in (
    'fuerza', 'potencia', 'movilidad', 'core', 'estabilidad', 'activacion', 'velocidad', 'resistencia'
  )),
  muscle_groups text[] not null default '{}',
  equipment text[] not null default '{}',
  description text,
  instructions text,
  coaching_cues text,
  video_url text check (video_url is null or video_url ~* '^https://'),
  unilateral boolean not null default false,
  source_exercise_id uuid references public.exercises(id) on delete set null,
  archived boolean not null default false,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index exercises_org_idx on public.exercises(org_id, archived);
create index exercises_name_idx on public.exercises using gin (to_tsvector('spanish', name));
create unique index exercises_org_name on public.exercises(org_id, lower(name)) where org_id is not null and not archived;
create unique index exercises_global_name on public.exercises(lower(name)) where org_id is null;
create trigger exercises_updated_at before update on public.exercises
  for each row execute function public.set_updated_at();

create table public.exercise_media (
  id uuid primary key default gen_random_uuid(),
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  storage_path text not null unique,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index exercise_media_exercise_idx on public.exercise_media(exercise_id);

create or replace function public.exercise_org(p_exercise uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select org_id from public.exercises where id = p_exercise;
$$;

alter table public.exercises enable row level security;
alter table public.exercise_media enable row level security;

create policy exercises_select on public.exercises for select to authenticated
  using (org_id is null or public.is_org_member(org_id));
create policy exercises_insert on public.exercises for insert to authenticated
  with check (org_id is not null and public.is_org_staff(org_id));
create policy exercises_update on public.exercises for update to authenticated
  using (org_id is not null and public.is_org_staff(org_id))
  with check (org_id is not null and public.is_org_staff(org_id));
create policy exercises_delete on public.exercises for delete to authenticated
  using (org_id is not null and public.is_org_staff(org_id));

create policy exercise_media_select on public.exercise_media for select to authenticated
  using (public.is_org_member(org_id));
create policy exercise_media_write on public.exercise_media for all to authenticated
  using (public.is_org_staff(org_id))
  with check (public.is_org_staff(org_id) and public.exercise_org(exercise_id) = org_id);

-- ---------- Storage: fotos de ejercicios (privado, carpeta por organización) ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('exercise-media', 'exercise-media', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create or replace function public.storage_org(p_name text)
returns uuid language plpgsql immutable as $$
begin
  return (string_to_array(p_name, '/'))[1]::uuid;
exception when others then
  return null;
end $$;

create policy exercise_media_read on storage.objects for select to authenticated
  using (bucket_id = 'exercise-media' and public.is_org_member(public.storage_org(name)));
create policy exercise_media_upload on storage.objects for insert to authenticated
  with check (bucket_id = 'exercise-media' and public.is_org_staff(public.storage_org(name)));
create policy exercise_media_remove on storage.objects for delete to authenticated
  using (bucket_id = 'exercise-media' and public.is_org_staff(public.storage_org(name)));
