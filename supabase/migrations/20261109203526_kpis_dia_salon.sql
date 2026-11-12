-- Indicadores de "Hoy" del docente (docs/analisis-docente.md, sección "Indicadores de Hoy"):
-- una fila por día con el % de lecturas del salón con ruido alto, con temperatura en rango y con
-- luz suficiente, y el número de momentos (sin pulsaciones accidentales).
-- Función security invoker (respeta RLS): un usuario sin acceso al salón recibe 0 filas.
-- Solo coincidencias; nunca causas ni diagnósticos. Los umbrales llegan como parámetros
-- (viven en apps/web/src/lib/thresholds.ts).

create function public.classroom_daily_stats(
  p_classroom uuid,
  p_days integer default 35,
  p_noise numeric default 75,
  p_temp_low numeric default 18,
  p_temp_high numeric default 26,
  p_light_ok numeric default 300
)
returns table (
  day date,
  isodow integer,
  readings bigint,
  red_pct numeric,
  temp_ok_pct numeric,
  light_ok_pct numeric,
  events bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  with rd as (
    select
      (r.measured_at at time zone 'America/Mexico_City')::date as d,
      count(*) as n,
      count(*) filter (where r.noise_peak is not null) as noise_n,
      count(*) filter (where r.noise_peak >= p_noise) as noise_high,
      count(*) filter (where r.temp_c is not null) as temp_n,
      count(*) filter (where r.temp_c >= p_temp_low and r.temp_c < p_temp_high) as temp_ok,
      count(*) filter (where r.light_lux is not null) as light_n,
      count(*) filter (where r.light_lux >= p_light_ok) as light_ok
    from public.sensor_readings r
    where r.classroom_id = p_classroom
      and r.measured_at >= now() - make_interval(days => p_days)
    group by 1
  ),
  ev as (
    select
      (e.occurred_at at time zone 'America/Mexico_City')::date as d,
      count(*) as n
    from public.toy_events e
    join public.children c on c.id = e.child_id
    where c.classroom_id = p_classroom
      and e.occurred_at >= now() - make_interval(days => p_days)
      and e.id not in (select public.accidental_event_ids())
    group by 1
  ),
  days as (
    select d from rd union select d from ev
  )
  select
    days.d,
    extract(isodow from days.d)::integer,
    coalesce(rd.n, 0),
    case when rd.noise_n > 0 then round(100.0 * rd.noise_high / rd.noise_n, 1) end,
    case when rd.temp_n > 0 then round(100.0 * rd.temp_ok / rd.temp_n, 1) end,
    case when rd.light_n > 0 then round(100.0 * rd.light_ok / rd.light_n, 1) end,
    coalesce(ev.n, 0)
  from days
  left join rd on rd.d = days.d
  left join ev on ev.d = days.d
  order by days.d;
$$;

revoke all on function public.classroom_daily_stats(uuid, integer, numeric, numeric, numeric, numeric) from public, anon;
grant execute on function public.classroom_daily_stats(uuid, integer, numeric, numeric, numeric, numeric) to authenticated;
