-- =====================================================================
-- Base multi-entrenador: organizaciones, perfiles, roles, deportes,
-- alumnos, lesiones, grupos e invitaciones. Todo protegido con RLS.
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------- utilidades ----------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------- organizaciones (un espacio por entrenador) ----------
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  plan text not null default 'free',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger organizations_updated_at before update on public.organizations
  for each row execute function public.set_updated_at();

-- ---------- perfiles (1 a 1 con auth.users) ----------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text,
  avatar_url text,
  timezone text not null default 'America/Argentina/Buenos_Aires',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''), new.email)
  on conflict (id) do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- membresías y roles ----------
create type public.member_role as enum ('owner', 'coach', 'athlete');

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.member_role not null,
  created_at timestamptz not null default now(),
  unique (org_id, user_id, role)
);
create index memberships_user_idx on public.memberships(user_id);

-- ¿El usuario actual es entrenador (dueño o entrenador) de la organización?
create or replace function public.is_org_staff(p_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.memberships m
    where m.org_id = p_org and m.user_id = auth.uid() and m.role in ('owner', 'coach')
  );
$$;

create or replace function public.is_org_member(p_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.memberships m
    where m.org_id = p_org and m.user_id = auth.uid()
  );
$$;

-- ---------- deportes con campos propios ----------
create table public.sports (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organizations(id) on delete cascade, -- null = deporte global
  slug text not null,
  name text not null,
  created_at timestamptz not null default now()
);
create unique index sports_global_slug on public.sports(slug) where org_id is null;
create unique index sports_org_slug on public.sports(org_id, slug) where org_id is not null;

create table public.sport_fields (
  id uuid primary key default gen_random_uuid(),
  sport_id uuid not null references public.sports(id) on delete cascade,
  key text not null check (key ~ '^[a-z][a-z0-9_]*$'),
  label text not null,
  field_type text not null check (field_type in ('text', 'long_text', 'number', 'select')),
  unit text,
  options jsonb not null default '[]'::jsonb,
  sort_order int not null default 0,
  unique (sport_id, key)
);

-- ---------- alumnos ----------
create table public.athletes (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  first_name text not null check (char_length(first_name) between 1 and 80),
  last_name text not null default '' check (char_length(last_name) <= 80),
  email text check (email is null or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone text,
  birth_date date,
  sex text check (sex in ('femenino', 'masculino', 'otro')),
  height_cm numeric(5,1) check (height_cm is null or height_cm between 50 and 250),
  weight_kg numeric(5,1) check (weight_kg is null or weight_kg between 20 and 300),
  sport_id uuid references public.sports(id) on delete set null,
  level text check (level in ('principiante', 'intermedio', 'avanzado', 'elite')),
  goals text,
  training_days text[] not null default '{}',
  sessions_per_week smallint check (sessions_per_week is null or sessions_per_week between 0 and 14),
  equipment text[] not null default '{}',
  notes text,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index athletes_org_idx on public.athletes(org_id, status);
create unique index athletes_org_user on public.athletes(org_id, user_id) where user_id is not null;
create unique index athletes_org_email on public.athletes(org_id, lower(email)) where email is not null;
create trigger athletes_updated_at before update on public.athletes
  for each row execute function public.set_updated_at();

-- Datos específicos del deporte (los campos los define sport_fields)
create table public.athlete_sport_profiles (
  athlete_id uuid not null references public.athletes(id) on delete cascade,
  sport_id uuid not null references public.sports(id) on delete cascade,
  values jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (athlete_id, sport_id)
);
create trigger athlete_sport_profiles_updated_at before update on public.athlete_sport_profiles
  for each row execute function public.set_updated_at();

create or replace function public.athlete_org(p_athlete uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select org_id from public.athletes where id = p_athlete;
$$;

create or replace function public.is_self_athlete(p_athlete uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.athletes a where a.id = p_athlete and a.user_id = auth.uid());
$$;

-- ---------- lesiones y limitaciones ----------
create table public.injuries (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  athlete_id uuid not null references public.athletes(id) on delete cascade,
  body_area text not null check (char_length(body_area) between 1 and 80),
  description text,
  severity text not null default 'leve' check (severity in ('leve', 'moderada', 'grave')),
  status text not null default 'activa' check (status in ('activa', 'en_recuperacion', 'resuelta')),
  started_on date,
  resolved_on date,
  limitations text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index injuries_athlete_idx on public.injuries(athlete_id);
create index injuries_org_status_idx on public.injuries(org_id, status);
create trigger injuries_updated_at before update on public.injuries
  for each row execute function public.set_updated_at();

-- ---------- grupos ----------
create table public.athlete_groups (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  description text,
  created_at timestamptz not null default now()
);
create table public.group_members (
  group_id uuid not null references public.athlete_groups(id) on delete cascade,
  athlete_id uuid not null references public.athletes(id) on delete cascade,
  primary key (group_id, athlete_id)
);

create or replace function public.group_org(p_group uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select org_id from public.athlete_groups where id = p_group;
$$;

-- ---------- invitaciones ----------
create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  athlete_id uuid not null references public.athletes(id) on delete cascade,
  email text not null,
  token_hash text not null unique,
  expires_at timestamptz not null default now() + interval '14 days',
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index invitations_athlete_idx on public.invitations(athlete_id);

-- =====================================================================
-- Funciones de negocio (RPC)
-- =====================================================================

-- Crea el espacio de un entrenador y lo deja como dueño.
create or replace function public.create_organization(p_name text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_org uuid;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if exists (select 1 from public.memberships where user_id = auth.uid() and role = 'owner') then
    raise exception 'already_owner';
  end if;
  insert into public.organizations (name, created_by) values (trim(p_name), auth.uid()) returning id into v_org;
  insert into public.memberships (org_id, user_id, role) values (v_org, auth.uid(), 'owner');
  return v_org;
end $$;

-- Crea (o renueva) la invitación de un alumno. Devuelve el token en claro una sola vez.
create or replace function public.create_invitation(p_athlete uuid)
returns text language plpgsql security definer set search_path = public, extensions as $$
declare
  v_ath public.athletes;
  v_token text;
begin
  select * into v_ath from public.athletes where id = p_athlete;
  if not found or not public.is_org_staff(v_ath.org_id) then raise exception 'forbidden'; end if;
  if v_ath.email is null then raise exception 'athlete_without_email'; end if;
  if v_ath.user_id is not null then raise exception 'already_linked'; end if;

  update public.invitations set revoked_at = now()
    where athlete_id = p_athlete and accepted_at is null and revoked_at is null;

  v_token := encode(extensions.gen_random_bytes(24), 'hex');
  insert into public.invitations (org_id, athlete_id, email, token_hash, created_by)
  values (v_ath.org_id, p_athlete, lower(v_ath.email), encode(extensions.digest(v_token, 'sha256'), 'hex'), auth.uid());
  return v_token;
end $$;

-- Datos públicos mínimos de una invitación vigente (para la pantalla de aceptación).
create or replace function public.get_invitation(p_token text)
returns table (email text, athlete_first_name text, org_name text, expires_at timestamptz)
language sql stable security definer set search_path = public, extensions as $$
  select i.email, a.first_name, o.name, i.expires_at
  from public.invitations i
  join public.athletes a on a.id = i.athlete_id
  join public.organizations o on o.id = i.org_id
  where i.token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
    and i.accepted_at is null and i.revoked_at is null and i.expires_at > now()
    and a.user_id is null;
$$;

-- El usuario logueado acepta la invitación: queda vinculado a su ficha.
create or replace function public.accept_invitation(p_token text)
returns uuid language plpgsql security definer set search_path = public, extensions as $$
declare
  v_inv public.invitations;
  v_email text;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  select * into v_inv from public.invitations
   where token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
     and accepted_at is null and revoked_at is null and expires_at > now()
   for update;
  if not found then raise exception 'invalid_invitation'; end if;

  select lower(email) into v_email from auth.users where id = auth.uid();
  if v_email is distinct from lower(v_inv.email) then raise exception 'email_mismatch'; end if;

  update public.athletes set user_id = auth.uid() where id = v_inv.athlete_id and user_id is null;
  if not found then raise exception 'already_linked'; end if;

  insert into public.memberships (org_id, user_id, role) values (v_inv.org_id, auth.uid(), 'athlete')
    on conflict do nothing;
  update public.invitations set accepted_at = now() where id = v_inv.id;
  return v_inv.athlete_id;
end $$;

-- Desvincula la cuenta de un alumno (por ejemplo, si se equivocó de email).
create or replace function public.unlink_athlete(p_athlete uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_ath public.athletes;
begin
  select * into v_ath from public.athletes where id = p_athlete;
  if not found or not public.is_org_staff(v_ath.org_id) then raise exception 'forbidden'; end if;
  if v_ath.user_id is not null then
    delete from public.memberships where org_id = v_ath.org_id and user_id = v_ath.user_id and role = 'athlete'
      and not exists (select 1 from public.athletes x where x.org_id = v_ath.org_id and x.user_id = v_ath.user_id and x.id <> p_athlete);
    update public.athletes set user_id = null where id = p_athlete;
  end if;
end $$;

-- =====================================================================
-- Seguridad por fila
-- =====================================================================
alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.memberships enable row level security;
alter table public.sports enable row level security;
alter table public.sport_fields enable row level security;
alter table public.athletes enable row level security;
alter table public.athlete_sport_profiles enable row level security;
alter table public.injuries enable row level security;
alter table public.athlete_groups enable row level security;
alter table public.group_members enable row level security;
alter table public.invitations enable row level security;

-- organizaciones
create policy org_select on public.organizations for select to authenticated using (public.is_org_member(id));
create policy org_update on public.organizations for update to authenticated
  using (public.is_org_staff(id)) with check (public.is_org_staff(id));

-- perfiles: el propio, o los de alumnos/entrenadores con quienes comparto organización
create policy profiles_select on public.profiles for select to authenticated using (
  id = auth.uid() or exists (
    select 1 from public.memberships mine join public.memberships theirs on theirs.org_id = mine.org_id
    where mine.user_id = auth.uid() and theirs.user_id = profiles.id
      and (mine.role in ('owner', 'coach') or theirs.role in ('owner', 'coach'))
  )
);
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- membresías: las propias y, para el staff, las de su organización
create policy memberships_select on public.memberships for select to authenticated
  using (user_id = auth.uid() or public.is_org_staff(org_id));

-- deportes
create policy sports_select on public.sports for select to authenticated
  using (org_id is null or public.is_org_member(org_id));
create policy sports_write on public.sports for all to authenticated
  using (org_id is not null and public.is_org_staff(org_id))
  with check (org_id is not null and public.is_org_staff(org_id));

create policy sport_fields_select on public.sport_fields for select to authenticated using (
  exists (select 1 from public.sports s where s.id = sport_id and (s.org_id is null or public.is_org_member(s.org_id)))
);
create policy sport_fields_write on public.sport_fields for all to authenticated using (
  exists (select 1 from public.sports s where s.id = sport_id and s.org_id is not null and public.is_org_staff(s.org_id))
) with check (
  exists (select 1 from public.sports s where s.id = sport_id and s.org_id is not null and public.is_org_staff(s.org_id))
);

-- alumnos: el staff ve y edita los de su organización; el alumno ve solo su ficha
create policy athletes_select on public.athletes for select to authenticated
  using (public.is_org_staff(org_id) or user_id = auth.uid());
create policy athletes_insert on public.athletes for insert to authenticated
  with check (public.is_org_staff(org_id) and user_id is null);
create policy athletes_update on public.athletes for update to authenticated
  using (public.is_org_staff(org_id)) with check (public.is_org_staff(org_id));
create policy athletes_delete on public.athletes for delete to authenticated
  using (public.is_org_staff(org_id));

-- La vinculación de cuentas solo pasa por accept_invitation / unlink_athlete.
create or replace function public.athletes_guard_user_id()
returns trigger language plpgsql as $$
begin
  -- Dentro de las funciones security definer current_user es el dueño (postgres);
  -- un update directo desde la app corre como "authenticated" y se rechaza.
  if new.user_id is distinct from old.user_id and current_user = 'authenticated' then
    raise exception 'user_id_is_managed';
  end if;
  return new;
end $$;
create trigger athletes_guard_user_id before update on public.athletes
  for each row execute function public.athletes_guard_user_id();

create policy asp_select on public.athlete_sport_profiles for select to authenticated
  using (public.is_org_staff(public.athlete_org(athlete_id)) or public.is_self_athlete(athlete_id));
create policy asp_write on public.athlete_sport_profiles for all to authenticated
  using (public.is_org_staff(public.athlete_org(athlete_id)))
  with check (public.is_org_staff(public.athlete_org(athlete_id)));

-- lesiones: el staff gestiona; el alumno ve y puede cargar las suyas
create policy injuries_select on public.injuries for select to authenticated
  using (public.is_org_staff(org_id) or public.is_self_athlete(athlete_id));
create policy injuries_insert on public.injuries for insert to authenticated with check (
  org_id = public.athlete_org(athlete_id)
  and (public.is_org_staff(org_id) or public.is_self_athlete(athlete_id))
);
create policy injuries_update on public.injuries for update to authenticated
  using (public.is_org_staff(org_id)) with check (public.is_org_staff(org_id) and org_id = public.athlete_org(athlete_id));
create policy injuries_delete on public.injuries for delete to authenticated
  using (public.is_org_staff(org_id));

-- grupos: solo staff
create policy groups_all on public.athlete_groups for all to authenticated
  using (public.is_org_staff(org_id)) with check (public.is_org_staff(org_id));
create policy group_members_all on public.group_members for all to authenticated
  using (public.is_org_staff(public.group_org(group_id)))
  with check (
    public.is_org_staff(public.group_org(group_id))
    and public.athlete_org(athlete_id) = public.group_org(group_id)
  );

-- invitaciones: solo staff puede verlas; se crean por RPC
create policy invitations_select on public.invitations for select to authenticated
  using (public.is_org_staff(org_id));

-- Las RPC no se exponen a usuarios anónimos salvo get_invitation.
revoke execute on function public.create_organization(text) from anon, public;
revoke execute on function public.create_invitation(uuid) from anon, public;
revoke execute on function public.accept_invitation(text) from anon, public;
revoke execute on function public.unlink_athlete(uuid) from anon, public;
grant execute on function public.create_organization(text) to authenticated;
grant execute on function public.create_invitation(uuid) to authenticated;
grant execute on function public.accept_invitation(text) to authenticated;
grant execute on function public.unlink_athlete(uuid) to authenticated;
grant execute on function public.get_invitation(text) to anon, authenticated;

-- =====================================================================
-- Datos de referencia: golf como primer deporte
-- =====================================================================
with golf as (
  insert into public.sports (slug, name) values ('golf', 'Golf') returning id
)
insert into public.sport_fields (sport_id, key, label, field_type, unit, options, sort_order)
select golf.id, f.key, f.label, f.field_type, f.unit, f.options::jsonb, f.sort_order
from golf, (values
  ('handicap', 'Handicap', 'number', null, '[]', 1),
  ('mano_dominante', 'Mano dominante', 'select', null, '["Diestro","Zurdo"]', 2),
  ('frecuencia_practica', 'Frecuencia de práctica', 'number', 'días por semana', '[]', 3),
  ('frecuencia_juego', 'Frecuencia de juego', 'number', 'rondas por mes', '[]', 4),
  ('objetivos_rendimiento', 'Objetivos de rendimiento', 'long_text', null, '[]', 5)
) as f(key, label, field_type, unit, options, sort_order);

insert into public.sports (slug, name) values ('general', 'Preparación física general');
