-- Análisis para la vista del docente (Fase 1). Justificación y fuentes: docs/analisis-docente.md.
-- Todo es security invoker: respeta RLS del usuario que consulta. Un tutor que pide datos de un niño
-- ajeno obtiene ceros o filas vacías. Los umbrales llegan como parámetros desde lib/thresholds.ts.
-- Solo coincidencias entre ambiente y momentos; nunca causas ni diagnósticos.

-- ---------------------------------------------------------------------------
-- A1/A2: razón de coincidencia por condición con intervalo de Wilson (95 %).
-- Momentos: ventana de 5 min previa a cada pulsación (event_summary).
-- Línea base COMPARABLE: la misma ventana de 5 min anclada en cada lectura del salón,
-- para no comparar "una ventana de 5 min" contra "una lectura suelta".
-- ---------------------------------------------------------------------------

create function public.child_condition_lift(
  p_child uuid,
  p_days integer default 30,
  p_noise numeric default 75,        -- pico de ruido (dB aprox.)
  p_noise_avg numeric default 60,    -- ruido sostenido: promedio en la ventana
  p_light_swing numeric default 500, -- cambio brusco de luz (lux, máx. − mín. en la ventana)
  p_light_high numeric default 1000, -- luz muy intensa (lux)
  p_temp_high numeric default 26,    -- calor (°C, promedio)
  p_hum_high numeric default 60      -- humedad alta (%, promedio)
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
    -- Intervalo de Wilson al 95 % (z = 1.96; z² = 3.8416): recomendado para n pequeño
    case when calc.n > 0 then round(100 * (
      (calc.k::numeric / calc.n + 1.9208 / calc.n
        - 1.96 * sqrt((calc.k::numeric / calc.n) * (1 - calc.k::numeric / calc.n) / calc.n + 0.9604 / (calc.n::numeric * calc.n)))
      / (1 + 3.8416 / calc.n)), 1) end,
    case when calc.n > 0 then round(100 * (
      (calc.k::numeric / calc.n + 1.9208 / calc.n
        + 1.96 * sqrt((calc.k::numeric / calc.n) * (1 - calc.k::numeric / calc.n) / calc.n + 0.9604 / (calc.n::numeric * calc.n)))
      / (1 + 3.8416 / calc.n)), 1) end
  from calc
  order by calc.ord;
$$;

revoke all on function public.child_condition_lift(uuid, integer, numeric, numeric, numeric, numeric, numeric, numeric) from public, anon;
grant execute on function public.child_condition_lift(uuid, integer, numeric, numeric, numeric, numeric, numeric, numeric) to authenticated;

-- ---------------------------------------------------------------------------
-- A3: curva antes y después del momento (análisis de épocas superpuestas).
-- Promedio de las lecturas del salón por tramos relativos a cada pulsación,
-- más el rango habitual del ruido del salón (percentiles 25, 50 y 75).
-- ---------------------------------------------------------------------------

create function public.child_event_curve(
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

revoke all on function public.child_event_curve(uuid, integer, integer, integer, integer) from public, anon;
grant execute on function public.child_event_curve(uuid, integer, integer, integer, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- B4: perfiles del salón. Por niño: momentos en el periodo, últimos 7 días frente a
-- los 7 anteriores, y la condición con mayor coincidencia que cumpla el mínimo de
-- momentos y de razón (prioriza las que superan la línea base con el límite de Wilson).
-- ---------------------------------------------------------------------------

create function public.classroom_profiles(
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
      where e.child_id = c.id and e.occurred_at >= now() - make_interval(days => p_days)),
    (select count(*) from public.toy_events e
      where e.child_id = c.id and e.occurred_at >= now() - interval '7 days'),
    (select count(*) from public.toy_events e
      where e.child_id = c.id
        and e.occurred_at >= now() - interval '14 days'
        and e.occurred_at < now() - interval '7 days'),
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

revoke all on function public.classroom_profiles(uuid, integer, numeric, numeric, numeric, numeric, numeric, numeric, integer, numeric) from public, anon;
grant execute on function public.classroom_profiles(uuid, integer, numeric, numeric, numeric, numeric, numeric, numeric, integer, numeric) to authenticated;
