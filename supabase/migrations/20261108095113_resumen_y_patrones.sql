-- Resumen por evento y patrones por niño. El análisis vive en SQL (docs/arquitectura.md).
-- Ambos respetan RLS del usuario que consulta (security invoker).

-- ---------------------------------------------------------------------------
-- event_summary: una fila por pulsación con el resumen de las lecturas de la
-- caja del salón en los 5 minutos previos (misma ventana que event_context).
-- ---------------------------------------------------------------------------

create view public.event_summary
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
  round(avg(r.humidity_pct)::numeric, 1) as humidity_avg
from public.toy_events e
join public.children c on c.id = e.child_id
left join public.sensor_readings r
  on r.classroom_id = c.classroom_id
 and r.measured_at between e.occurred_at - interval '5 minutes' and e.occurred_at
group by e.id, e.child_id, e.occurred_at, e.ts_source;

revoke all on public.event_summary from anon;
grant select on public.event_summary to authenticated;

-- ---------------------------------------------------------------------------
-- child_patterns: coincidencias entre las condiciones previas a los eventos y
-- las del resto del tiempo (línea base del salón). Solo muestra coincidencias,
-- no causas ni diagnósticos.
-- ---------------------------------------------------------------------------

create function public.child_patterns(
  p_child uuid,
  p_days integer default 30,
  p_noise numeric default 75,        -- dB (aprox.) que se considera pico alto
  p_light_swing numeric default 500  -- variación de lux dentro de la ventana que se considera brusca
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

revoke all on function public.child_patterns(uuid, integer, numeric, numeric) from public, anon;
grant execute on function public.child_patterns(uuid, integer, numeric, numeric) to authenticated;
