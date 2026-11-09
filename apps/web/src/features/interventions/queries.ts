import { createClient } from "@/lib/supabase/server";
import { PATTERNS } from "@/lib/thresholds";

export async function listInterventions(childId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("interventions")
    .select("id, title, started_on, note")
    .eq("child_id", childId)
    .order("started_on", { ascending: false });
  if (error) throw new Error(`No se pudieron cargar los ajustes: ${error.message}`);
  return data;
}

export async function compareIntervention(childId: string, date: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("child_intervention_compare", {
    p_child: childId,
    p_date: date,
    p_window_days: 14,
    p_noise: PATTERNS.noiseHigh,
  });
  if (error) throw new Error(`No se pudo comparar antes y después: ${error.message}`);
  return data.map((r) => ({
    period: r.period,
    days_with_data: Number(r.days_with_data),
    events: Number(r.events),
    events_per_day: r.events_per_day === null ? null : Number(r.events_per_day),
  }));
}

export type Intervention = Awaited<ReturnType<typeof listInterventions>>[number];
