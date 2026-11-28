-- =====================================================================
-- Foto de perfil del alumno.
-- Archivo en Storage privado: <org_id>/<athlete_id>/<archivo>.jpg
-- La sube el propio alumno (o su entrenador). La ven el alumno y el staff
-- de su organización. Nadie más.
-- =====================================================================

alter table public.athletes add column if not exists photo_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('athlete-photos', 'athlete-photos', false, 1048576, array['image/jpeg', 'image/webp', 'image/png'])
on conflict (id) do nothing;

-- Segundo tramo de la ruta (athlete_id) o null si no es un uuid.
create or replace function public.storage_athlete(p_name text)
returns uuid language plpgsql immutable as $$
begin
  return (string_to_array(p_name, '/'))[2]::uuid;
exception when others then
  return null;
end $$;

-- ¿Puede el usuario actual manejar la foto de ese archivo? (el alumno dueño o su entrenador,
-- y la carpeta de organización tiene que coincidir con la del alumno)
create or replace function public.can_manage_athlete_photo(p_name text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.athletes a
    where a.id = public.storage_athlete(p_name)
      and a.org_id = public.storage_org(p_name)
      and (a.user_id = auth.uid() or public.is_org_staff(a.org_id))
  );
$$;

create policy athlete_photos_read on storage.objects for select to authenticated
  using (bucket_id = 'athlete-photos' and public.can_manage_athlete_photo(name));
create policy athlete_photos_upload on storage.objects for insert to authenticated
  with check (bucket_id = 'athlete-photos' and public.can_manage_athlete_photo(name));
create policy athlete_photos_remove on storage.objects for delete to authenticated
  using (bucket_id = 'athlete-photos' and public.can_manage_athlete_photo(name));

-- Guarda (o quita, con p_path null) la foto del alumno. El alumno no puede editar su ficha
-- directamente, por eso pasa por acá. Devuelve la ruta anterior para borrar el archivo viejo.
create or replace function public.set_athlete_photo(p_athlete uuid, p_path text)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_ath public.athletes;
  v_old text;
begin
  select * into v_ath from public.athletes where id = p_athlete;
  if not found or not (v_ath.user_id = auth.uid() or public.is_org_staff(v_ath.org_id)) then
    raise exception 'forbidden';
  end if;
  if p_path is not null then
    if p_path not like v_ath.org_id::text || '/' || v_ath.id::text || '/%' then
      raise exception 'invalid_path';
    end if;
    if not exists (select 1 from storage.objects o where o.bucket_id = 'athlete-photos' and o.name = p_path) then
      raise exception 'missing_file';
    end if;
  end if;
  v_old := v_ath.photo_path;
  update public.athletes set photo_path = p_path where id = p_athlete;
  return v_old;
end $$;

revoke all on function public.set_athlete_photo(uuid, text) from public, anon;
grant execute on function public.set_athlete_photo(uuid, text) to authenticated;
