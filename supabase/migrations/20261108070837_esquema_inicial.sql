-- Esquema inicial de Tuli (contrato v1). Ver docs/contrato-datos.md.
-- Principio: TODO con RLS. Los usuarios (padre/docente) solo LEEN. Las escrituras de
-- dispositivos las hace /api/ingest con service_role. Nunca politicas para anon.

-- ---------------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('guardian', 'teacher')),
  full_name text,
  created_at timestamptz not null default now()
);

create table public.classrooms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table public.children (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid not null references public.classrooms (id) on delete restrict,
  display_name text not null, -- alias o iniciales; nunca datos de identidad reales en desarrollo
  created_at timestamptz not null default now()
);

create table public.guardians (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  child_id uuid not null references public.children (id) on delete cascade,
  primary key (profile_id, child_id)
);

create table public.teacher_classrooms (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  classroom_id uuid not null references public.classrooms (id) on delete cascade,
  primary key (profile_id, classroom_id)
);

create table public.devices (
  id uuid primary key default gen_random_uuid(),
  device_id text not null unique, -- ej. tuli-toy-01, tuli-box-01
  kind text not null check (kind in ('toy', 'box')),
  child_id uuid references public.children (id) on delete set null,
  classroom_id uuid references public.classrooms (id) on delete set null,
  token_hash text not null, -- sha256 hex del token; el token nunca se guarda
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  check (kind <> 'toy' or child_id is not null),
  check (kind <> 'box' or classroom_id is not null)
);

create table public.toy_events (
  id bigint generated always as identity primary key,
  device_id text not null references public.devices (device_id),
  child_id uuid not null references public.children (id) on delete cascade,
  occurred_at timestamptz not null,
  received_at timestamptz not null default now(),
  ts_source text not null check (ts_source in ('ntp', 'server', 'unsynced')),
  seq bigint not null,
  unique (device_id, seq)
);

create table public.sensor_readings (
  id bigint generated always as identity primary key,
  device_id text not null references public.devices (device_id),
  classroom_id uuid not null references public.classrooms (id) on delete cascade,
  measured_at timestamptz not null,
  received_at timestamptz not null default now(),
  ts_source text not null check (ts_source in ('ntp', 'server', 'unsynced')),
  seq bigint not null,
  window_s integer,
  noise_avg real,
  noise_peak real,
  light_lux real,
  temp_c real,
  humidity_pct real check (humidity_pct is null or (humidity_pct >= 0 and humidity_pct <= 100)),
  unique (device_id, seq)
);

-- Registro de cada peticion a /api/ingest (aceptada o rechazada). Solo service_role.
create table public.ingest_log (
  id bigint generated always as identity primary key,
  received_at timestamptz not null default now(),
  device_id text,
  type text,
  status integer not null,
  outcome text not null, -- ok | invalid | unauthorized | duplicate | rate_limited | error
  detail text
);

-- ---------------------------------------------------------------------------
-- Indices (llaves foraneas usadas por RLS y consultas de contexto)
-- ---------------------------------------------------------------------------

create index children_classroom_idx on public.children (classroom_id);
create index guardians_child_idx on public.guardians (child_id);
create index teacher_classrooms_classroom_idx on public.teacher_classrooms (classroom_id);
create index devices_child_idx on public.devices (child_id);
create index devices_classroom_idx on public.devices (classroom_id);
create index toy_events_child_time_idx on public.toy_events (child_id, occurred_at desc);
create index sensor_readings_room_time_idx on public.sensor_readings (classroom_id, measured_at desc);
create index ingest_log_received_idx on public.ingest_log (received_at desc);

-- ---------------------------------------------------------------------------
-- Funciones auxiliares para RLS (security definer + search_path fijo evita recursion)
-- ---------------------------------------------------------------------------

create function public.is_guardian_of(p_child uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.guardians g
    where g.profile_id = (select auth.uid()) and g.child_id = p_child
  );
$$;

create function public.is_teacher_of_classroom(p_classroom uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.teacher_classrooms t
    where t.profile_id = (select auth.uid()) and t.classroom_id = p_classroom
  );
$$;

-- Docente del salon del nino, o tutor del nino.
create function public.can_view_child(p_child uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_guardian_of(p_child)
    or exists (
      select 1 from public.children c
      where c.id = p_child and public.is_teacher_of_classroom(c.classroom_id)
    );
$$;

-- Docente del salon, o tutor de algun nino de ese salon (ve las condiciones del ambiente).
create function public.can_view_classroom(p_classroom uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_teacher_of_classroom(p_classroom)
    or exists (
      select 1 from public.children c
      join public.guardians g on g.child_id = c.id
      where c.classroom_id = p_classroom and g.profile_id = (select auth.uid())
    );
$$;

revoke all on function public.is_guardian_of(uuid) from public, anon;
revoke all on function public.is_teacher_of_classroom(uuid) from public, anon;
revoke all on function public.can_view_child(uuid) from public, anon;
revoke all on function public.can_view_classroom(uuid) from public, anon;
grant execute on function public.is_guardian_of(uuid) to authenticated;
grant execute on function public.is_teacher_of_classroom(uuid) to authenticated;
grant execute on function public.can_view_child(uuid) to authenticated;
grant execute on function public.can_view_classroom(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Perfil automatico al registrarse. El rol por si solo NO da acceso a nada:
-- un docente ve datos solo si un administrador lo agrega a teacher_classrooms.
-- ---------------------------------------------------------------------------

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, role, full_name)
  values (
    new.id,
    case when new.raw_user_meta_data ->> 'role' = 'teacher' then 'teacher' else 'guardian' end,
    new.raw_user_meta_data ->> 'full_name'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- RLS: activada en TODAS las tablas
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.classrooms enable row level security;
alter table public.children enable row level security;
alter table public.guardians enable row level security;
alter table public.teacher_classrooms enable row level security;
alter table public.devices enable row level security;
alter table public.toy_events enable row level security;
alter table public.sensor_readings enable row level security;
alter table public.ingest_log enable row level security; -- sin politicas: solo service_role

create policy "perfil propio" on public.profiles
  for select to authenticated using (id = (select auth.uid()));

create policy "salones visibles" on public.classrooms
  for select to authenticated using (public.can_view_classroom(id));

create policy "ninos visibles" on public.children
  for select to authenticated using (public.can_view_child(id));

create policy "mis vinculos de tutor" on public.guardians
  for select to authenticated using (profile_id = (select auth.uid()));

create policy "mis salones de docente" on public.teacher_classrooms
  for select to authenticated using (profile_id = (select auth.uid()));

create policy "dispositivos visibles" on public.devices
  for select to authenticated using (
    (kind = 'toy' and child_id is not null and public.can_view_child(child_id))
    or (kind = 'box' and classroom_id is not null and public.can_view_classroom(classroom_id))
  );

create policy "eventos visibles" on public.toy_events
  for select to authenticated using (public.can_view_child(child_id));

create policy "lecturas visibles" on public.sensor_readings
  for select to authenticated using (public.can_view_classroom(classroom_id));

-- ---------------------------------------------------------------------------
-- Permisos a nivel de tabla (defensa en profundidad, ademas de RLS)
-- ---------------------------------------------------------------------------

revoke all on all tables in schema public from anon;
revoke insert, update, delete, truncate on all tables in schema public from authenticated;
revoke all on public.ingest_log from authenticated;

-- El hash del token nunca se expone a usuarios: se lista cada columna menos token_hash.
revoke select on public.devices from authenticated;
grant select (id, device_id, kind, child_id, classroom_id, last_seen_at, created_at)
  on public.devices to authenticated;

-- ---------------------------------------------------------------------------
-- Contexto de cada evento: lecturas de la caja del salon en los 5 min previos.
-- security_invoker: la vista respeta RLS del usuario que consulta.
-- ---------------------------------------------------------------------------

create view public.event_context
with (security_invoker = true) as
select
  e.id as event_id,
  e.child_id,
  e.occurred_at,
  r.id as reading_id,
  r.measured_at,
  r.window_s,
  r.noise_avg,
  r.noise_peak,
  r.light_lux,
  r.temp_c,
  r.humidity_pct
from public.toy_events e
join public.children c on c.id = e.child_id
join public.sensor_readings r
  on r.classroom_id = c.classroom_id
 and r.measured_at between e.occurred_at - interval '5 minutes' and e.occurred_at;

revoke all on public.event_context from anon;
grant select on public.event_context to authenticated;

-- ---------------------------------------------------------------------------
-- Realtime: el dashboard se actualiza solo (Realtime respeta RLS)
-- ---------------------------------------------------------------------------

alter publication supabase_realtime add table public.toy_events;
alter publication supabase_realtime add table public.sensor_readings;
