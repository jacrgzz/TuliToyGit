-- Fase 3a: lo que el docente ESCRIBE (primeras escrituras de usuarios; hasta ahora solo leían).
--   C3  bitácora de actividades del salón (classroom_activities)
--   C4  nota en un momento y "pulsación accidental" (event_notes)
--   C5  ajustes por niño para comparar antes y después (interventions)
-- Reglas: solo el DOCENTE del salón escribe (el admin sigue siendo de solo lectura; los tutores no
-- escriben). Cada tabla tiene RLS; los permisos por columna impiden tocar created_by o los ids.
-- Una pulsación marcada como accidental sale de TODOS los análisis, para todos los roles por igual.
-- Justificación y fuentes: docs/analisis-docente.md.

-- ---------------------------------------------------------------------------
-- Funciones auxiliares (security definer, search_path fijo)
-- ---------------------------------------------------------------------------

create function public.is_teacher_of_child(p_child uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.children c
    join public.teacher_classrooms t on t.classroom_id = c.classroom_id
    where c.id = p_child and t.profile_id = (select auth.uid())
  );
$$;

create function public.is_teacher_of_event(p_event bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.toy_events e
    join public.children c on c.id = e.child_id
    join public.teacher_classrooms t on t.classroom_id = c.classroom_id
    where e.id = p_event and t.profile_id = (select auth.uid())
  );
$$;

revoke all on function public.is_teacher_of_child(uuid) from public, anon;
revoke all on function public.is_teacher_of_event(bigint) from public, anon;
grant execute on function public.is_teacher_of_child(uuid) to authenticated;
grant execute on function public.is_teacher_of_event(bigint) to authenticated;

create function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Intervalo de Wilson al 95 % en porcentaje (k éxitos de n); recomendado para n pequeño.
create function public.wilson_low(k bigint, n bigint)
returns numeric
language sql
immutable
set search_path = ''
as $$
  select case when n > 0 then round(100 * (
    (k::numeric / n + 1.9208 / n
      - 1.96 * sqrt((k::numeric / n) * (1 - k::numeric / n) / n + 0.9604 / (n::numeric * n)))
    / (1 + 3.8416 / n)), 1) end;
$$;

create function public.wilson_high(k bigint, n bigint)
returns numeric
language sql
immutable
set search_path = ''
as $$
  select case when n > 0 then round(100 * (
    (k::numeric / n + 1.9208 / n
      + 1.96 * sqrt((k::numeric / n) * (1 - k::numeric / n) / n + 0.9604 / (n::numeric * n)))
    / (1 + 3.8416 / n)), 1) end;
$$;

grant execute on function public.wilson_low(bigint, bigint) to authenticated;
grant execute on function public.wilson_high(bigint, bigint) to authenticated;
revoke all on function public.wilson_low(bigint, bigint) from public, anon;
revoke all on function public.wilson_high(bigint, bigint) from public, anon;

-- ---------------------------------------------------------------------------
-- C3: bitácora de actividades del salón
-- ---------------------------------------------------------------------------

create table public.classroom_activities (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid not null references public.classrooms (id) on delete cascade,
  kind text not null check (kind in ('examen', 'recreo', 'musica', 'lectura', 'cambio', 'otra')),
  name text not null check (char_length(name) between 1 and 80),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  created_by uuid not null default auth.uid() references public.profiles (id),
  created_at timestamptz not null default now(),
  check (ends_at > starts_at and ends_at - starts_at <= interval '12 hours')
);

create index classroom_activities_room_time_idx
  on public.classroom_activities (classroom_id, starts_at desc);

alter table public.classroom_activities enable row level security;

-- Las actividades son del salón (no identifican a ningún niño): las ve quien ve el salón.
create policy "actividades visibles" on public.classroom_activities
  for select to authenticated
  using (classroom_id in (select public.visible_classroom_ids()));

create policy "docente crea actividades" on public.classroom_activities
  for insert to authenticated
  with check (public.is_teacher_of_classroom(classroom_id) and created_by = (select auth.uid()));

create policy "docente edita actividades" on public.classroom_activities
  for update to authenticated
  using (public.is_teacher_of_classroom(classroom_id))
  with check (public.is_teacher_of_classroom(classroom_id));

create policy "docente borra actividades" on public.classroom_activities
  for delete to authenticated
  using (public.is_teacher_of_classroom(classroom_id));

revoke all on public.classroom_activities from anon;
revoke insert, update, delete, truncate on public.classroom_activities from authenticated;
grant insert (classroom_id, kind, name, starts_at, ends_at) on public.classroom_activities to authenticated;
grant update (kind, name, starts_at, ends_at) on public.classroom_activities to authenticated;
grant delete on public.classroom_activities to authenticated;

-- ---------------------------------------------------------------------------
-- C4: nota en un momento y marca de pulsación accidental (una por evento)
-- Las ven los docentes del salón y el admin. Los tutores NO (pueden contener observaciones del aula).
-- ---------------------------------------------------------------------------

create table public.event_notes (
  id uuid primary key default gen_random_uuid(),
  event_id bigint not null unique references public.toy_events (id) on delete cascade,
  note text not null default '' check (char_length(note) <= 500),
  accidental boolean not null default false,
  created_by uuid not null default auth.uid() references public.profiles (id),
  updated_at timestamptz not null default now()
);

create trigger event_notes_touch
before update on public.event_notes
for each row execute function public.touch_updated_at();

alter table public.event_notes enable row level security;

create policy "notas visibles al docente y admin" on public.event_notes
  for select to authenticated
  using (public.is_teacher_of_event(event_id) or public.is_admin());

create policy "docente crea notas" on public.event_notes
  for insert to authenticated
  with check (public.is_teacher_of_event(event_id) and created_by = (select auth.uid()));

create policy "docente edita notas" on public.event_notes
  for update to authenticated
  using (public.is_teacher_of_event(event_id))
  with check (public.is_teacher_of_event(event_id));

create policy "docente borra notas" on public.event_notes
  for delete to authenticated
  using (public.is_teacher_of_event(event_id));

revoke all on public.event_notes from anon;
revoke insert, update, delete, truncate on public.event_notes from authenticated;
grant insert (event_id, note, accidental) on public.event_notes to authenticated;
grant update (note, accidental) on public.event_notes to authenticated;
grant delete on public.event_notes to authenticated;

-- Ids de pulsaciones accidentales. security definer: TODOS los roles (también los tutores, que no
-- pueden leer event_notes) excluyen las mismas pulsaciones; así el análisis es idéntico para todos.
-- Solo devuelve ids, nunca la nota.
create function public.accidental_event_ids()
returns setof bigint
language sql
stable
security definer
set search_path = ''
as $$
  select n.event_id from public.event_notes n where n.accidental;
$$;

revoke all on function public.accidental_event_ids() from public, anon;
grant execute on function public.accidental_event_ids() to authenticated;

-- ---------------------------------------------------------------------------
-- C5: ajustes por niño (cambio de lugar, audífonos, otra rutina…) para comparar antes y después
-- ---------------------------------------------------------------------------

create table public.interventions (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 80),
  started_on date not null,
  note text not null default '' check (char_length(note) <= 300),
  created_by uuid not null default auth.uid() references public.profiles (id),
  created_at timestamptz not null default now()
);

create index interventions_child_idx on public.interventions (child_id, started_on desc);

alter table public.interventions enable row level security;

create policy "ajustes visibles" on public.interventions
  for select to authenticated
  using (child_id in (select public.visible_child_ids()));

create policy "docente crea ajustes" on public.interventions
  for insert to authenticated
  with check (public.is_teacher_of_child(child_id) and created_by = (select auth.uid()));

create policy "docente edita ajustes" on public.interventions
  for update to authenticated
  using (public.is_teacher_of_child(child_id))
  with check (public.is_teacher_of_child(child_id));

create policy "docente borra ajustes" on public.interventions
  for delete to authenticated
  using (public.is_teacher_of_child(child_id));

revoke all on public.interventions from anon;
revoke insert, update, delete, truncate on public.interventions from authenticated;
grant insert (child_id, title, started_on, note) on public.interventions to authenticated;
grant update (title, started_on, note) on public.interventions to authenticated;
grant delete on public.interventions to authenticated;

-- ---------------------------------------------------------------------------
-- Las pulsaciones accidentales salen de los análisis (misma regla en todas las funciones).
-- event_summary conserva TODAS las pulsaciones (la lista de momentos las muestra marcadas)
-- y agrega la columna accidental; los análisis filtran `not accidental`.
-- ---------------------------------------------------------------------------

create or replace view public.event_summary
with (security_invoker = true) as
select
  e.id as event_id,
  e.child_id,
  e.occurred_at,
  e.ts_source,
  count(r.id) as readings_count,
  round(avg(r.noise_avg)::numeric, 1) as noise_avg,
  max(r.noise_peak) as noise_peak_max,
  min(r.light_lux) as light_min,
  max(r.light_lux) as light_max,
  round(avg(r.temp_c)::numeric, 1) as temp_avg,
  round(avg(r.humidity_pct)::numeric, 1) as humidity_avg,
  (e.id in (select public.accidental_event_ids())) as accidental
from public.toy_events e
join public.children c on c.id = e.child_id
left join public.sensor_readings r
  on r.classroom_id = c.classroom_id
 and r.measured_at between e.occurred_at - interval '5 minutes' and e.occurred_at
group by e.id, e.child_id, e.occurred_at, e.ts_source;

create or replace function public.child_patterns(
  p_child uuid,
  p_days integer default 30,
  p_noise numeric default 75,
  p_light_swing numeric default 500
)
returns table (
  total_events bigint,
  events_with_context bigint,
  noise_high_events bigint,
  light_swing_events bigint,
  avg_noise_before numeric,
  avg_peak_before numeric,
  avg_temp_before numeric,
  avg_humidity_before numeric,
  baseline_readings bigint,
  baseline_noise_avg numeric,
  baseline_noise_high_pct numeric
)
language sql
stable
security invoker
set search_path = ''
as $$
  with ev as (
    select *
    from public.event_summary s
    where s.child_id = p_child
      and not s.accidental
      and s.occurred_at >= now() - make_interval(days => p_days)
  ),
  base as (
    select r.noise_avg, r.noise_peak
    from public.sensor_readings r
    where r.classroom_id = (select c.classroom_id from public.children c where c.id = p_child)
      and r.measured_at >= now() - make_interval(days => p_days)
  )
  select
    (select count(*) from ev),
    (select count(*) from ev where readings_count > 0),
    (select count(*) from ev where noise_peak_max >= p_noise),
    (select count(*) from ev where light_max - light_min >= p_light_swing),
    (select round(avg(noise_avg)::numeric, 1) from ev),
    (select round(avg(noise_peak_max)::numeric, 1) from ev),
    (select round(avg(temp_avg)::numeric, 1) from ev),
    (select round(avg(humidity_avg)::numeric, 1) from ev),
    (select count(*) from base),
    (select round(avg(noise_avg)::numeric, 1) from base),
    (select round(100.0 * count(*) filter (where noise_peak >= p_noise) / nullif(count(*), 0), 1) from base);
$$;

create or replace function public.child_condition_lift(
  p_child uuid,
  p_days integer default 30,
  p_noise numeric default 75,
  p_noise_avg numeric default 60,
  p_light_swing numeric default 500,
  p_light_high numeric default 1000,
  p_temp_high numeric default 26,
  p_hum_high numeric default 60
)
returns table (
  condition text,
  events_total bigint,
  events_with bigint,
  event_pct numeric,
  baseline_total bigint,
  baseline_with bigint,
  baseline_pct numeric,
  lift numeric,
  wilson_low numeric,
  wilson_high numeric
)
language sql
stable
security invoker
set search_path = ''
as $$
  with child as (
    select c.classroom_id from public.children c where c.id = p_child
  ),
  ev as (
    select s.noise_peak_max, s.noise_avg, s.light_min, s.light_max, s.temp_avg, s.humidity_avg
    from public.event_summary s
    where s.child_id = p_child
      and not s.accidental
      and s.readings_count > 0
      and s.occurred_at >= now() - make_interval(days => p_days)
  ),
  win as (
    select
      max(r.noise_peak) over w as noise_peak_max,
      avg(r.noise_avg) over w as noise_avg,
      min(r.light_lux) over w as light_min,
      max(r.light_lux) over w as light_max,
      avg(r.temp_c) over w as temp_avg,
      avg(r.humidity_pct) over w as humidity_avg
    from public.sensor_readings r
    where r.classroom_id = (select classroom_id from child)
      and r.measured_at >= now() - make_interval(days => p_days)
    window w as (order by r.measured_at range between interval '5 minutes' preceding and current row)
  ),
  flags as (
    select 'ev' as src, x.cond, x.flag
    from ev
    cross join lateral (values
      ('ruido_pico', ev.noise_peak_max >= p_noise),
      ('ruido_sostenido', ev.noise_avg >= p_noise_avg),
      ('luz_brusca', ev.light_max - ev.light_min >= p_light_swing),
      ('luz_alta', ev.light_max >= p_light_high),
      ('calor', ev.temp_avg >= p_temp_high),
      ('humedad_alta', ev.humidity_avg >= p_hum_high)
    ) as x(cond, flag)
    union all
    select 'base', x.cond, x.flag
    from win
    cross join lateral (values
      ('ruido_pico', win.noise_peak_max >= p_noise),
      ('ruido_sostenido', win.noise_avg >= p_noise_avg),
      ('luz_brusca', win.light_max - win.light_min >= p_light_swing),
      ('luz_alta', win.light_max >= p_light_high),
      ('calor', win.temp_avg >= p_temp_high),
      ('humedad_alta', win.humidity_avg >= p_hum_high)
    ) as x(cond, flag)
  ),
  agg as (
    select
      f.cond,
      count(f.flag) filter (where f.src = 'ev') as ev_n,
      count(*) filter (where f.src = 'ev' and f.flag) as ev_k,
      count(f.flag) filter (where f.src = 'base') as base_n,
      count(*) filter (where f.src = 'base' and f.flag) as base_k
    from flags f
    group by f.cond
  ),
  conds(cond, ord) as (
    values ('ruido_pico', 1), ('ruido_sostenido', 2), ('luz_brusca', 3),
           ('luz_alta', 4), ('calor', 5), ('humedad_alta', 6)
  ),
  calc as (
    select
      c.cond, c.ord,
      coalesce(a.ev_n, 0) as n,
      coalesce(a.ev_k, 0) as k,
      coalesce(a.base_n, 0) as bn,
      coalesce(a.base_k, 0) as bk
    from conds c
    left join agg a on a.cond = c.cond
  )
  select
    calc.cond,
    calc.n,
    calc.k,
    case when calc.n > 0 then round(100.0 * calc.k / calc.n, 1) end,
    calc.bn,
    calc.bk,
    case when calc.bn > 0 then round(100.0 * calc.bk / calc.bn, 1) end,
    case when calc.n > 0 and calc.bk > 0
      then round((calc.k::numeric / calc.n) / (calc.bk::numeric / calc.bn), 2) end,
    public.wilson_low(calc.k, calc.n),
    public.wilson_high(calc.k, calc.n)
  from calc
  order by calc.ord;
$$;

create or replace function public.child_event_curve(
  p_child uuid,
  p_days integer default 30,
  p_before_min integer default 10,
  p_after_min integer default 5,
  p_bucket_s integer default 30
)
returns table (
  offset_s integer,
  noise_avg numeric,
  noise_peak numeric,
  light_avg numeric,
  events bigint,
  baseline_p25 numeric,
  baseline_p50 numeric,
  baseline_p75 numeric
)
language sql
stable
security invoker
set search_path = ''
as $$
  with child as (
    select c.classroom_id from public.children c where c.id = p_child
  ),
  ev as (
    select e.id, e.occurred_at
    from public.toy_events e
    where e.child_id = p_child
      and e.occurred_at >= now() - make_interval(days => p_days)
      and e.id not in (select public.accidental_event_ids())
  ),
  pts as (
    select
      (floor(extract(epoch from (r.measured_at - ev.occurred_at)) / p_bucket_s) * p_bucket_s)::integer as off_s,
      r.noise_avg as n_avg,
      r.noise_peak as n_peak,
      r.light_lux as lux,
      ev.id as event_id
    from ev
    join public.sensor_readings r
      on r.classroom_id = (select classroom_id from child)
     and r.measured_at between ev.occurred_at - make_interval(mins => p_before_min)
                           and ev.occurred_at + make_interval(mins => p_after_min)
  ),
  base as (
    select
      percentile_cont(0.25) within group (order by r.noise_avg) as p25,
      percentile_cont(0.50) within group (order by r.noise_avg) as p50,
      percentile_cont(0.75) within group (order by r.noise_avg) as p75
    from public.sensor_readings r
    where r.classroom_id = (select classroom_id from child)
      and r.measured_at >= now() - make_interval(days => p_days)
  )
  select
    p.off_s,
    round(avg(p.n_avg)::numeric, 1),
    round(avg(p.n_peak)::numeric, 1),
    round(avg(p.lux)::numeric, 0),
    count(distinct p.event_id),
    round(b.p25::numeric, 1),
    round(b.p50::numeric, 1),
    round(b.p75::numeric, 1)
  from pts p
  cross join base b
  group by p.off_s, b.p25, b.p50, b.p75
  order by p.off_s;
$$;

create or replace function public.classroom_profiles(
  p_classroom uuid,
  p_days integer default 30,
  p_noise numeric default 75,
  p_noise_avg numeric default 60,
  p_light_swing numeric default 500,
  p_light_high numeric default 1000,
  p_temp_high numeric default 26,
  p_hum_high numeric default 60,
  p_min_events integer default 5,
  p_min_lift numeric default 1.5
)
returns table (
  child_id uuid,
  display_name text,
  events_period bigint,
  events_last7 bigint,
  events_prev7 bigint,
  top_condition text,
  top_lift numeric,
  top_events_with bigint,
  top_events_total bigint,
  top_event_pct numeric,
  top_baseline_pct numeric,
  top_wilson_low numeric
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    c.id,
    c.display_name,
    (select count(*) from public.toy_events e
      where e.child_id = c.id and e.occurred_at >= now() - make_interval(days => p_days)
        and e.id not in (select public.accidental_event_ids())),
    (select count(*) from public.toy_events e
      where e.child_id = c.id and e.occurred_at >= now() - interval '7 days'
        and e.id not in (select public.accidental_event_ids())),
    (select count(*) from public.toy_events e
      where e.child_id = c.id
        and e.occurred_at >= now() - interval '14 days'
        and e.occurred_at < now() - interval '7 days'
        and e.id not in (select public.accidental_event_ids())),
    t.condition,
    t.lift,
    t.events_with,
    t.events_total,
    t.event_pct,
    t.baseline_pct,
    t.wilson_low
  from public.children c
  left join lateral (
    select l.*
    from public.child_condition_lift(
      c.id, p_days, p_noise, p_noise_avg, p_light_swing, p_light_high, p_temp_high, p_hum_high
    ) l
    where l.events_total >= p_min_events
      and l.lift >= p_min_lift
    order by (l.wilson_low > l.baseline_pct) desc, l.lift desc
    limit 1
  ) t on true
  where c.classroom_id = p_classroom
  order by c.display_name;
$$;

create or replace function public.child_hourly_heatmap(p_child uuid, p_days integer default 30)
returns table (dow integer, hour integer, events bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    extract(isodow from x.l)::integer,
    extract(hour from x.l)::integer,
    count(*)
  from (
    select e.occurred_at at time zone 'America/Mexico_City' as l
    from public.toy_events e
    where e.child_id = p_child
      and e.occurred_at >= now() - make_interval(days => p_days)
      and e.id not in (select public.accidental_event_ids())
  ) x
  group by 1, 2
  order by 1, 2;
$$;

create or replace function public.child_daily_counts(p_child uuid, p_days integer default 30)
returns table (day date, readings bigint, events bigint, moving_avg numeric)
language sql
stable
security invoker
set search_path = ''
as $$
  with child as (
    select c.classroom_id from public.children c where c.id = p_child
  ),
  days as (
    select d::date as day
    from generate_series(
      ((now() at time zone 'America/Mexico_City')::date - (p_days - 1)),
      (now() at time zone 'America/Mexico_City')::date,
      interval '1 day'
    ) d
    where extract(isodow from d) < 6
  ),
  ev as (
    select (e.occurred_at at time zone 'America/Mexico_City')::date as day, count(*) as n
    from public.toy_events e
    where e.child_id = p_child
      and e.occurred_at >= now() - make_interval(days => p_days + 1)
      and e.id not in (select public.accidental_event_ids())
    group by 1
  ),
  rd as (
    select (r.measured_at at time zone 'America/Mexico_City')::date as day, count(*) as n
    from public.sensor_readings r
    where r.classroom_id = (select classroom_id from child)
      and r.measured_at >= now() - make_interval(days => p_days + 1)
    group by 1
  ),
  joined as (
    select
      d.day,
      coalesce(rd.n, 0) as readings,
      case when coalesce(rd.n, 0) > 0 then coalesce(ev.n, 0) end as events
    from days d
    left join ev on ev.day = d.day
    left join rd on rd.day = d.day
  )
  select
    j.day,
    j.readings,
    j.events,
    round(avg(j.events) over (order by j.day rows between 6 preceding and current row)::numeric, 2)
  from joined j
  order by j.day;
$$;

create or replace function public.child_episodes(
  p_child uuid,
  p_days integer default 30,
  p_gap_min integer default 10
)
returns table (started_at timestamptz, ended_at timestamptz, presses bigint, duration_s integer)
language sql
stable
security invoker
set search_path = ''
as $$
  with e as (
    select
      t.occurred_at,
      lag(t.occurred_at) over (order by t.occurred_at) as prev
    from public.toy_events t
    where t.child_id = p_child
      and t.occurred_at >= now() - make_interval(days => p_days)
      and t.id not in (select public.accidental_event_ids())
  ),
  g as (
    select
      e.occurred_at,
      sum(case when e.prev is null or e.occurred_at - e.prev > make_interval(mins => p_gap_min) then 1 else 0 end)
        over (order by e.occurred_at) as grp
    from e
  )
  select
    min(g.occurred_at),
    max(g.occurred_at),
    count(*),
    extract(epoch from (max(g.occurred_at) - min(g.occurred_at)))::integer
  from g
  group by g.grp
  order by min(g.occurred_at) desc;
$$;

create or replace function public.classroom_day_events(p_classroom uuid, p_day date)
returns table (child_id uuid, display_name text, occurred_at timestamptz)
language sql
stable
security invoker
set search_path = ''
as $$
  select e.child_id, c.display_name, e.occurred_at
  from public.toy_events e
  join public.children c on c.id = e.child_id
  where c.classroom_id = p_classroom
    and (e.occurred_at at time zone 'America/Mexico_City')::date = p_day
    and e.id not in (select public.accidental_event_ids())
  order by e.occurred_at;
$$;

-- ---------------------------------------------------------------------------
-- C3 en el análisis: la actividad como una condición más. Misma forma de salida que
-- child_condition_lift para reutilizar las barras. Momento "durante" la actividad; línea base =
-- % de las lecturas del salón del periodo que cayeron dentro de una actividad de ese tipo.
-- ---------------------------------------------------------------------------

create function public.child_activity_lift(p_child uuid, p_days integer default 30)
returns table (
  condition text,
  events_total bigint,
  events_with bigint,
  event_pct numeric,
  baseline_total bigint,
  baseline_with bigint,
  baseline_pct numeric,
  lift numeric,
  wilson_low numeric,
  wilson_high numeric
)
language sql
stable
security invoker
set search_path = ''
as $$
  with child as (
    select c.classroom_id from public.children c where c.id = p_child
  ),
  acts as (
    select a.kind, a.starts_at, a.ends_at
    from public.classroom_activities a
    where a.classroom_id = (select classroom_id from child)
      and a.ends_at >= now() - make_interval(days => p_days)
  ),
  kinds as (
    select k.kind, k.ord
    from (values ('examen', 1), ('recreo', 2), ('musica', 3), ('lectura', 4), ('cambio', 5), ('otra', 6)) k(kind, ord)
    where exists (select 1 from acts a where a.kind = k.kind)
  ),
  ev as (
    select e.occurred_at
    from public.toy_events e
    where e.child_id = p_child
      and e.occurred_at >= now() - make_interval(days => p_days)
      and e.id not in (select public.accidental_event_ids())
  ),
  rd as (
    select r.measured_at
    from public.sensor_readings r
    where r.classroom_id = (select classroom_id from child)
      and r.measured_at >= now() - make_interval(days => p_days)
  ),
  tot as (
    select (select count(*) from ev) as n, (select count(*) from rd) as bn
  ),
  calc as (
    select
      k.kind, k.ord, tot.n, tot.bn,
      (select count(*) from ev where exists (
        select 1 from acts a where a.kind = k.kind and ev.occurred_at between a.starts_at and a.ends_at)) as kk,
      (select count(*) from rd where exists (
        select 1 from acts a where a.kind = k.kind and rd.measured_at between a.starts_at and a.ends_at)) as bk
    from kinds k
    cross join tot
  )
  select
    'act_' || calc.kind,
    calc.n,
    calc.kk,
    case when calc.n > 0 then round(100.0 * calc.kk / calc.n, 1) end,
    calc.bn,
    calc.bk,
    case when calc.bn > 0 then round(100.0 * calc.bk / calc.bn, 1) end,
    case when calc.n > 0 and calc.bk > 0
      then round((calc.kk::numeric / calc.n) / (calc.bk::numeric / calc.bn), 2) end,
    public.wilson_low(calc.kk, calc.n),
    public.wilson_high(calc.kk, calc.n)
  from calc
  order by calc.ord;
$$;

-- ---------------------------------------------------------------------------
-- C5: comparar antes y después de un ajuste. Días hábiles CON lecturas de la caja (un día sin
-- caja no cuenta como cero). Es una observación descriptiva (diseño AB): no demuestra causa.
-- ---------------------------------------------------------------------------

create function public.child_intervention_compare(
  p_child uuid,
  p_date date,
  p_window_days integer default 14,
  p_noise numeric default 75
)
returns table (
  period text,
  days_with_data bigint,
  events bigint,
  events_per_day numeric,
  events_with_context bigint,
  events_noise_high bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  with child as (
    select c.classroom_id from public.children c where c.id = p_child
  ),
  today as (select (now() at time zone 'America/Mexico_City')::date as d),
  days as (
    select
      d::date as day,
      case when d::date < p_date then 'antes' else 'despues' end as period
    from generate_series(
      p_date - p_window_days,
      least(p_date + p_window_days - 1, (select d from today)),
      interval '1 day'
    ) d
    where extract(isodow from d) < 6
  ),
  rd as (
    select (r.measured_at at time zone 'America/Mexico_City')::date as day, count(*) as n
    from public.sensor_readings r
    where r.classroom_id = (select classroom_id from child)
      and r.measured_at >= (p_date - p_window_days)::timestamp at time zone 'America/Mexico_City'
    group by 1
  ),
  good_days as (
    select d.day, d.period from days d join rd on rd.day = d.day where rd.n > 0
  ),
  ev as (
    select
      (s.occurred_at at time zone 'America/Mexico_City')::date as day,
      s.readings_count, s.noise_peak_max
    from public.event_summary s
    where s.child_id = p_child and not s.accidental
  ),
  per as (
    select p.period from (values ('antes'), ('despues')) p(period)
  )
  select
    per.period,
    (select count(*) from good_days g where g.period = per.period),
    (select count(*) from ev join good_days g on g.day = ev.day where g.period = per.period),
    case when (select count(*) from good_days g where g.period = per.period) > 0
      then round((select count(*) from ev join good_days g on g.day = ev.day where g.period = per.period)::numeric
                 / (select count(*) from good_days g where g.period = per.period), 2) end,
    (select count(*) from ev join good_days g on g.day = ev.day where g.period = per.period and ev.readings_count > 0),
    (select count(*) from ev join good_days g on g.day = ev.day where g.period = per.period and ev.noise_peak_max >= p_noise)
  from per
  order by per.period;
$$;

-- ---------------------------------------------------------------------------
-- Permisos de las funciones nuevas
-- ---------------------------------------------------------------------------

revoke all on function public.child_activity_lift(uuid, integer) from public, anon;
revoke all on function public.child_intervention_compare(uuid, date, integer, numeric) from public, anon;
grant execute on function public.child_activity_lift(uuid, integer) to authenticated;
grant execute on function public.child_intervention_compare(uuid, date, integer, numeric) to authenticated;
