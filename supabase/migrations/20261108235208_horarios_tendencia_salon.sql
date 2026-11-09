-- Fase 2 del análisis del docente (docs/analisis-docente.md): horarios (A5), tendencia (A6),
-- episodios (A7) y vistas del salón (B1, B2, B3). Todo security invoker: respeta RLS.
-- Las fechas y horas se calculan en la zona horaria de México (America/Mexico_City), no en UTC.
-- Solo coincidencias y conteos; nunca causas ni diagnósticos.

-- ---------------------------------------------------------------------------
-- A5: momentos por día de la semana y hora (diagrama de dispersión de Touchette).
-- dow: 1 = lunes … 7 = domingo (ISO).
-- ---------------------------------------------------------------------------

create function public.child_hourly_heatmap(p_child uuid, p_days integer default 30)
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
  ) x
  group by 1, 2
  order by 1, 2;
$$;

-- ---------------------------------------------------------------------------
-- A6: momentos por día hábil con promedio móvil de 7 días hábiles.
-- Un día sin lecturas de la caja es "sin datos" (events = null), NO "cero momentos":
-- así una caja apagada no parece una mejoría. El promedio móvil ignora esos días.
-- ---------------------------------------------------------------------------

create function public.child_daily_counts(p_child uuid, p_days integer default 30)
returns table (day date, readings bigint, events bigint, moving_avg numeric)
language sql
stable
security invoker
set search_path = ''
as $$
  with tz as (select 'America/Mexico_City'::text as name),
  child as (
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

-- ---------------------------------------------------------------------------
-- A7: episodios. Pulsaciones a menos de p_gap_min minutos entre sí forman un episodio.
-- ---------------------------------------------------------------------------

create function public.child_episodes(
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

-- ---------------------------------------------------------------------------
-- B2: ruido del salón por día de la semana y hora (promedio y % de lecturas con pico alto).
-- ---------------------------------------------------------------------------

create function public.classroom_noise_heatmap(
  p_classroom uuid,
  p_days integer default 30,
  p_noise numeric default 75
)
returns table (dow integer, hour integer, readings bigint, noise_avg numeric, high_pct numeric)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    extract(isodow from x.l)::integer,
    extract(hour from x.l)::integer,
    count(*),
    round(avg(x.noise_avg)::numeric, 1),
    round(100.0 * count(*) filter (where x.noise_peak >= p_noise) / count(*), 1)
  from (
    select r.measured_at at time zone 'America/Mexico_City' as l, r.noise_avg, r.noise_peak
    from public.sensor_readings r
    where r.classroom_id = p_classroom
      and r.measured_at >= now() - make_interval(days => p_days)
      and r.noise_avg is not null
  ) x
  group by 1, 2
  order by 1, 2;
$$;

-- ---------------------------------------------------------------------------
-- B3: tiempo en zona roja por día hábil (% de lecturas con pico de ruido alto).
-- ---------------------------------------------------------------------------

create function public.classroom_daily_red(
  p_classroom uuid,
  p_days integer default 30,
  p_noise numeric default 75
)
returns table (day date, readings bigint, high_readings bigint, high_pct numeric)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    (r.measured_at at time zone 'America/Mexico_City')::date,
    count(*),
    count(*) filter (where r.noise_peak >= p_noise),
    round(100.0 * count(*) filter (where r.noise_peak >= p_noise) / count(*), 1)
  from public.sensor_readings r
  where r.classroom_id = p_classroom
    and r.measured_at >= now() - make_interval(days => p_days)
    and r.noise_peak is not null
    and extract(isodow from (r.measured_at at time zone 'America/Mexico_City')) < 6
  group by 1
  order by 1;
$$;

-- ---------------------------------------------------------------------------
-- B1: línea del día. Último día con lecturas y, para un día, el ruido y la luz en tramos
-- (p_bucket_min) y los momentos de todos los niños del salón.
-- ---------------------------------------------------------------------------

create function public.classroom_latest_day(p_classroom uuid)
returns date
language sql
stable
security invoker
set search_path = ''
as $$
  select (max(r.measured_at) at time zone 'America/Mexico_City')::date
  from public.sensor_readings r
  where r.classroom_id = p_classroom;
$$;

create function public.classroom_day_timeline(
  p_classroom uuid,
  p_day date,
  p_bucket_min integer default 5
)
returns table (bucket_start timestamptz, noise_avg numeric, noise_peak numeric, light_avg numeric)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    to_timestamp(floor(extract(epoch from r.measured_at) / (p_bucket_min * 60)) * (p_bucket_min * 60)),
    round(avg(r.noise_avg)::numeric, 1),
    round(max(r.noise_peak)::numeric, 1),
    round(avg(r.light_lux)::numeric, 0)
  from public.sensor_readings r
  where r.classroom_id = p_classroom
    and (r.measured_at at time zone 'America/Mexico_City')::date = p_day
  group by 1
  order by 1;
$$;

create function public.classroom_day_events(p_classroom uuid, p_day date)
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
  order by e.occurred_at;
$$;

-- ---------------------------------------------------------------------------
-- Permisos: solo usuarios con sesión (y RLS decide qué datos hay detrás).
-- ---------------------------------------------------------------------------

revoke all on function public.child_hourly_heatmap(uuid, integer) from public, anon;
revoke all on function public.child_daily_counts(uuid, integer) from public, anon;
revoke all on function public.child_episodes(uuid, integer, integer) from public, anon;
revoke all on function public.classroom_noise_heatmap(uuid, integer, numeric) from public, anon;
revoke all on function public.classroom_daily_red(uuid, integer, numeric) from public, anon;
revoke all on function public.classroom_latest_day(uuid) from public, anon;
revoke all on function public.classroom_day_timeline(uuid, date, integer) from public, anon;
revoke all on function public.classroom_day_events(uuid, date) from public, anon;

grant execute on function public.child_hourly_heatmap(uuid, integer) to authenticated;
grant execute on function public.child_daily_counts(uuid, integer) to authenticated;
grant execute on function public.child_episodes(uuid, integer, integer) to authenticated;
grant execute on function public.classroom_noise_heatmap(uuid, integer, numeric) to authenticated;
grant execute on function public.classroom_daily_red(uuid, integer, numeric) to authenticated;
grant execute on function public.classroom_latest_day(uuid) to authenticated;
grant execute on function public.classroom_day_timeline(uuid, date, integer) to authenticated;
grant execute on function public.classroom_day_events(uuid, date) to authenticated;
