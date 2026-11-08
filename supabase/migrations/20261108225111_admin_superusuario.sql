-- Superusuario (admin) de SOLO LECTURA: puede ver todas las vistas y datos para analizarlos.
-- Principios:
--  * Un admin es una fila en public.admins. Solo service_role puede crearla (npm run link ... admin);
--    ningún usuario puede ascenderse a sí mismo (no hay política ni permiso de escritura).
--  * El admin NO puede modificar datos desde la app: solo leer. Las escrituras siguen siendo
--    de /api/ingest y de los scripts con service_role.
--  * El hash del token de los dispositivos sigue sin ser legible para nadie (permisos por columna).

create table public.admins (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admins enable row level security;

create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admins a where a.profile_id = (select auth.uid())
  );
$$;

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

create policy "admin propio" on public.admins
  for select to authenticated using (profile_id = (select auth.uid()));

-- Las tablas nuevas heredan permisos amplios por defecto: se dejan solo en lectura.
revoke all on public.admins from anon;
revoke insert, update, delete, truncate on public.admins from authenticated;

-- ---------------------------------------------------------------------------
-- Las funciones de acceso reconocen al admin: así todas las políticas que ya
-- usan can_view_child / can_view_classroom (niños, salones, dispositivos,
-- eventos, lecturas y las vistas event_context / event_summary) le dan acceso.
-- ---------------------------------------------------------------------------

create or replace function public.can_view_child(p_child uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_admin()
    or public.is_guardian_of(p_child)
    or exists (
      select 1 from public.children c
      where c.id = p_child and public.is_teacher_of_classroom(c.classroom_id)
    );
$$;

create or replace function public.can_view_classroom(p_classroom uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_admin()
    or public.is_teacher_of_classroom(p_classroom)
    or exists (
      select 1 from public.children c
      join public.guardians g on g.child_id = c.id
      where c.classroom_id = p_classroom and g.profile_id = (select auth.uid())
    );
$$;

-- ---------------------------------------------------------------------------
-- Tablas que hasta ahora solo mostraban "lo propio"
-- ---------------------------------------------------------------------------

create policy "admin ve perfiles" on public.profiles
  for select to authenticated using (public.is_admin());

create policy "admin ve vinculos de tutores" on public.guardians
  for select to authenticated using (public.is_admin());

create policy "admin ve vinculos de docentes" on public.teacher_classrooms
  for select to authenticated using (public.is_admin());

-- ingest_log: solo el admin lo lee (para depurar dispositivos). Nadie más.
grant select on public.ingest_log to authenticated;
create policy "admin ve ingest_log" on public.ingest_log
  for select to authenticated using (public.is_admin());

-- ---------------------------------------------------------------------------
-- Correo en el perfil, para que el admin reconozca a cada usuario.
-- ---------------------------------------------------------------------------

alter table public.profiles add column email text;

update public.profiles p
set email = u.email
from auth.users u
where u.id = p.id;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, role, full_name, email)
  values (
    new.id,
    case when new.raw_user_meta_data ->> 'role' = 'teacher' then 'teacher' else 'guardian' end,
    new.raw_user_meta_data ->> 'full_name',
    new.email
  );
  return new;
end;
$$;
