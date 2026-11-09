import { createClient } from "@/lib/supabase/server";
import { LIFT_PARAMS, PATTERNS } from "@/lib/thresholds";

// Análisis calculados en SQL (migración perfiles_docente); aquí solo se consultan.
// RLS: si el usuario no puede ver al niño o al salón, recibe ceros o listas vacías.

export async function getConditionLift(childId: string, days: number) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("child_condition_lift", {
    p_child: childId,
    p_days: days,
    ...LIFT_PARAMS,
  });
  if (error) throw new Error(`No se pudo calcular el perfil de sensibilidad: ${error.message}`);
  return data;
}

export async function getActivityLift(childId: string, days: number) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("child_activity_lift", { p_child: childId, p_days: days });
  if (error) throw new Error(`No se pudo calcular el perfil por actividad: ${error.message}`);
  return data;
}

export async function getEventCurve(childId: string, days: number) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("child_event_curve", {
    p_child: childId,
    p_days: days,
    p_before_min: PATTERNS.curve.beforeMin,
    p_after_min: PATTERNS.curve.afterMin,
    p_bucket_s: PATTERNS.curve.bucketS,
  });
  if (error) throw new Error(`No se pudo calcular la curva de ruido: ${error.message}`);
  return data;
}

export async function getClassroomProfiles(classroomId: string, days: number) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("classroom_profiles", {
    p_classroom: classroomId,
    p_days: days,
    ...LIFT_PARAMS,
    p_min_events: PATTERNS.minEvents,
    p_min_lift: PATTERNS.minLift,
  });
  if (error) throw new Error(`No se pudieron calcular los perfiles del salón: ${error.message}`);
  return data;
}

export type ConditionLiftRow = Awaited<ReturnType<typeof getConditionLift>>[number];
export type EventCurvePoint = Awaited<ReturnType<typeof getEventCurve>>[number];
export type ClassroomProfile = Awaited<ReturnType<typeof getClassroomProfiles>>[number];

// ---------------------------------------------------------------------------
// Fase 2: horarios, tendencia, episodios y vistas del salón (migración horarios_tendencia_salon)
// ---------------------------------------------------------------------------

export async function getHourlyHeatmap(childId: string, days: number) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("child_hourly_heatmap", { p_child: childId, p_days: days });
  if (error) throw new Error(`No se pudo calcular el mapa de horarios: ${error.message}`);
  return data.map((r) => ({ dow: r.dow, hour: r.hour, value: Number(r.events) }));
}

export async function getDailyCounts(childId: string, days: number) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("child_daily_counts", { p_child: childId, p_days: days });
  if (error) throw new Error(`No se pudo calcular la tendencia: ${error.message}`);
  return data.map((r) => ({
    day: r.day,
    readings: Number(r.readings),
    events: r.events === null ? null : Number(r.events),
    moving_avg: r.moving_avg === null ? null : Number(r.moving_avg),
  }));
}

export async function getEpisodes(childId: string, days: number) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("child_episodes", {
    p_child: childId,
    p_days: days,
    p_gap_min: PATTERNS.episodeGapMin,
  });
  if (error) throw new Error(`No se pudieron calcular los episodios: ${error.message}`);
  return data.map((r) => ({
    started_at: r.started_at,
    ended_at: r.ended_at,
    presses: Number(r.presses),
    duration_s: Number(r.duration_s),
  }));
}

export async function getClassroomNoiseHeatmap(classroomId: string, days: number) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("classroom_noise_heatmap", {
    p_classroom: classroomId,
    p_days: days,
    p_noise: PATTERNS.noiseHigh,
  });
  if (error) throw new Error(`No se pudo calcular el ruido por hora: ${error.message}`);
  return data.map((r) => ({
    dow: r.dow,
    hour: r.hour,
    readings: Number(r.readings),
    noise_avg: r.noise_avg === null ? null : Number(r.noise_avg),
    high_pct: r.high_pct === null ? null : Number(r.high_pct),
  }));
}

export async function getClassroomDailyRed(classroomId: string, days: number) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("classroom_daily_red", {
    p_classroom: classroomId,
    p_days: days,
    p_noise: PATTERNS.noiseHigh,
  });
  if (error) throw new Error(`No se pudo calcular la zona roja: ${error.message}`);
  return data.map((r) => ({
    day: r.day,
    readings: Number(r.readings),
    high_readings: Number(r.high_readings),
    high_pct: r.high_pct === null ? 0 : Number(r.high_pct),
  }));
}

// Día para la línea del día: el elegido (YYYY-MM-DD) o el último con lecturas.
export async function getClassroomDay(classroomId: string, requested: string | null) {
  const supabase = await createClient();
  let day = requested;
  if (!day) {
    const { data, error } = await supabase.rpc("classroom_latest_day", { p_classroom: classroomId });
    if (error) throw new Error(`No se pudo ubicar el último día: ${error.message}`);
    day = data;
  }
  if (!day) return null;

  const [timeline, events] = await Promise.all([
    supabase.rpc("classroom_day_timeline", { p_classroom: classroomId, p_day: day, p_bucket_min: 5 }),
    supabase.rpc("classroom_day_events", { p_classroom: classroomId, p_day: day }),
  ]);
  if (timeline.error) throw new Error(`No se pudo cargar la línea del día: ${timeline.error.message}`);
  if (events.error) throw new Error(`No se pudieron cargar los momentos del día: ${events.error.message}`);
  return {
    day,
    timeline: timeline.data.map((r) => ({
      t: new Date(r.bucket_start).getTime(),
      noise_avg: r.noise_avg === null ? null : Number(r.noise_avg),
      noise_peak: r.noise_peak === null ? null : Number(r.noise_peak),
    })),
    events: events.data.map((e) => ({
      child_id: e.child_id,
      name: e.display_name,
      t: new Date(e.occurred_at).getTime(),
    })),
  };
}
