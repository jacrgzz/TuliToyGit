import { createClient } from "@/lib/supabase/server";

// Resumen por evento (vista event_summary): condiciones de los 5 min previos.
export async function listEventSummaries(childId: string, limit = 20) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("event_summary")
    .select(
      "event_id, child_id, occurred_at, ts_source, readings_count, noise_avg, noise_peak_max, light_min, light_max, temp_avg, humidity_avg, accidental",
    )
    .eq("child_id", childId)
    .order("occurred_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`No se pudieron cargar los eventos: ${error.message}`);
  return data;
}

export type EventSummary = Awaited<ReturnType<typeof listEventSummaries>>[number];

export async function getEventSummary(eventId: number) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("event_summary")
    .select("*")
    .eq("event_id", eventId)
    .maybeSingle();
  if (error) throw new Error(`No se pudo cargar el evento: ${error.message}`);
  return data;
}

// Lecturas de la caja en los 5 min previos al evento (vista event_context).
export async function getEventReadings(eventId: number) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("event_context")
    .select(
      "reading_id, measured_at, window_s, noise_avg, noise_peak, light_lux, temp_c, humidity_pct",
    )
    .eq("event_id", eventId)
    .order("measured_at", { ascending: true });
  if (error) throw new Error(`No se pudo cargar el contexto: ${error.message}`);
  return data;
}

// Conteo de pulsaciones por niño en las últimas horas (vista del docente).
export async function countRecentEventsByChild(hours = 24) {
  const supabase = await createClient();
  const since = new Date(Date.now() - hours * 3600 * 1000).toISOString();
  // event_summary (no toy_events) para que las pulsaciones accidentales no cuenten.
  const { data, error } = await supabase
    .from("event_summary")
    .select("child_id, occurred_at, accidental")
    .eq("accidental", false)
    .gte("occurred_at", since)
    .order("occurred_at", { ascending: false });
  if (error) throw new Error(`No se pudieron contar los eventos: ${error.message}`);
  const map = new Map<string, { count: number; last: string }>();
  for (const e of data) {
    if (!e.child_id || !e.occurred_at) continue;
    const cur = map.get(e.child_id);
    map.set(e.child_id, { count: (cur?.count ?? 0) + 1, last: cur?.last ?? e.occurred_at });
  }
  return map;
}

// Todos los momentos de un niño en los últimos `days` días (incluye los accidentales, marcados).
export async function listEventsSince(childId: string, days: number) {
  const supabase = await createClient();
  const since = new Date(Date.now() - days * 86400_000).toISOString();
  const { data, error } = await supabase
    .from("event_summary")
    .select("event_id, occurred_at, ts_source, readings_count, noise_avg, noise_peak_max, light_min, light_max, temp_avg, humidity_avg, accidental")
    .eq("child_id", childId)
    .gte("occurred_at", since)
    .order("occurred_at", { ascending: true });
  if (error) throw new Error(`No se pudieron cargar los momentos: ${error.message}`);
  return data;
}

// Momentos recientes de todos los niños que el usuario puede ver (RLS: el docente, su salón).
export async function listRecentEvents(days: number, limit = 100) {
  const supabase = await createClient();
  const since = new Date(Date.now() - days * 86400_000).toISOString();
  const { data, error } = await supabase
    .from("event_summary")
    .select(
      "event_id, child_id, occurred_at, ts_source, readings_count, noise_avg, noise_peak_max, light_min, light_max, temp_avg, humidity_avg, accidental",
    )
    .gte("occurred_at", since)
    .order("occurred_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`No se pudieron cargar los momentos: ${error.message}`);
  return data;
}
