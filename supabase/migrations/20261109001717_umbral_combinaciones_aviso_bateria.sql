-- Fase 3b del análisis del docente (docs/analisis-docente.md):
--   A4  umbral personal (distribución del pico de ruido antes de los momentos vs el resto del tiempo)
--   A8  combinaciones (ruido y luz juntos)
--   C2  aviso en vivo (ruido alto sostenido en el salón)
--   C7  batería del juguete (campo opcional del contrato v1: battery_pct)
-- Las funciones son security invoker (respetan RLS) y excluyen las pulsaciones accidentales.
-- Solo coincidencias; nunca causas ni diagnósticos.

-- ---------------------------------------------------------------------------
-- C7: batería. Opcional en el contrato (compatible hacia atrás). Lo escribe /api/ingest con service_role.
-- ---------------------------------------------------------------------------

alter table public.devices
  add column battery_pct real check (battery_pct is null or (battery_pct >= 0 and battery_pct <= 100)),
  add column battery_at timestamptz;

-- devices usa permisos por columna (token_hash nunca se expone): se agregan solo las nuevas.
grant select (battery_pct, battery_at) on public.devices to authenticated;

-- ---------------------------------------------------------------------------
-- A4: umbral personal. Pico de ruido máximo en la ventana de 5 min previa a cada momento,
-- frente al de cualquier ventana de 5 min del salón, en intervalos de p_bin dB.
-- ---------------------------------------------------------------------------

create function public.child_noise_distribution(
  p_child uuid,
  p_days integer default 30,
  p_bin integer default 5
)
returns table (
  bin_start integer,
  events_n bigint,
  baseline_n bigint,
  events_pct numeric,
  baseline_pct numeric
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
    select (floor(s.noise_peak_max / p_bin) * p_bin)::integer as bin
    from public.event_summary s
    where s.child_id = p_child
      and not s.accidental
      and s.readings_count > 0
      and s.noise_peak_max is not null
      and s.occurred_at >= now() - make_interval(days => p_days)
  ),
  win as (
    select (floor(max(r.noise_peak) over w / p_bin) * p_bin)::integer as bin
    from public.sensor_readings r
    where r.classroom_id = (select classroom_id from child)
      and r.noise_peak is not null
      and r.measured_at >= now() - make_interval(days => p_days)
    window w as (order by r.measured_at range between interval '5 minutes' preceding and current row)
  ),
  e as (select bin, count(*) as n from ev group by bin),
  b as (select bin, count(*) as n from win where bin is not null group by bin),
  bins as (select bin from e union select bin from b),
  tot as (
    select (select coalesce(sum(n), 0) from e) as en, (select coalesce(sum(n), 0) from b) as bn
  )
  select
    bins.bin,
    coalesce(e.n, 0),
    coalesce(b.n, 0),
    case when tot.en > 0 then round(100.0 * coalesce(e.n, 0) / tot.en, 1) else 0 end,
    case when tot.bn > 0 then round(100.0 * coalesce(b.n, 0) / tot.bn, 1) else 0 end
  from bins
  left join e on e.bin = bins.bin
  left join b on b.bin = bins.bin
  cross join tot
  order by bins.bin;
$$;

-- ---------------------------------------------------------------------------
-- A8: combinaciones de dos condiciones (pico de ruido y cambio brusco de luz): ambas, solo una, ninguna.
-- ---------------------------------------------------------------------------

create function public.child_condition_combo(
  p_child uuid,
  p_days integer default 30,
  p_noise numeric default 75,
  p_light_swing numeric default 500
)
returns table (
  combo text,
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
    select
      (s.noise_peak_max >= p_noise) as noise,
      (s.light_max - s.light_min >= p_light_swing) as light
    from public.event_summary s
    where s.child_id = p_child
      and not s.accidental
      and s.readings_count > 0
      and s.occurred_at >= now() - make_interval(days => p_days)
  ),
  win as (
    select
      (max(r.noise_peak) over w >= p_noise) as noise,
      (max(r.light_lux) over w - min(r.light_lux) over w >= p_light_swing) as light
    from public.sensor_readings r
    where r.classroom_id = (select classroom_id from child)
      and r.measured_at >= now() - make_interval(days => p_days)
    window w as (order by r.measured_at range between interval '5 minutes' preceding and current row)
  ),
  combos(combo, ord, noise, light) as (
    values ('ambas', 1, true, true), ('solo_ruido', 2, true, false),
           ('solo_luz', 3, false, true), ('ninguna', 4, false, false)
  ),
  calc as (
    select
      c.combo, c.ord,
      (select count(*) from ev) as n,
      (select count(*) from ev where coalesce(ev.noise, false) = c.noise and coalesce(ev.light, false) = c.light) as k,
      (select count(*) from win) as bn,
      (select count(*) from win where coalesce(win.noise, false) = c.noise and coalesce(win.light, false) = c.light) as bk
    from combos c
  )
  select
    calc.combo,
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

-- ---------------------------------------------------------------------------
-- C2: aviso en vivo. Lecturas de los últimos p_minutes minutos del salón y cuántas tienen pico alto.
-- La interfaz decide si avisa (lecturas suficientes, frescas y casi todas altas).
-- ---------------------------------------------------------------------------

create function public.classroom_live_noise(
  p_classroom uuid,
  p_minutes integer default 2,
  p_noise numeric default 75
)
returns table (readings_n bigint, high_n bigint, latest_at timestamptz, avg_peak numeric)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    count(*),
    count(*) filter (where r.noise_peak >= p_noise),
    max(r.measured_at),
    round(avg(r.noise_peak)::numeric, 1)
  from public.sensor_readings r
  where r.classroom_id = p_classroom
    and r.noise_peak is not null
    and r.measured_at >= now() - make_interval(mins => p_minutes);
$$;

revoke all on function public.child_noise_distribution(uuid, integer, integer) from public, anon;
revoke all on function public.child_condition_combo(uuid, integer, numeric, numeric) from public, anon;
revoke all on function public.classroom_live_noise(uuid, integer, numeric) from public, anon;
grant execute on function public.child_noise_distribution(uuid, integer, integer) to authenticated;
grant execute on function public.child_condition_combo(uuid, integer, numeric, numeric) to authenticated;
grant execute on function public.classroom_live_noise(uuid, integer, numeric) to authenticated;
