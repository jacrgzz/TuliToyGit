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
