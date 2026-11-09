import { createClient } from "@/lib/supabase/server";

// Actividades del salón en los últimos `days` días (RLS: las ve quien ve el salón).
export async function listActivities(classroomId: string, days = 14) {
  const supabase = await createClient();
  const since = new Date(Date.now() - days * 86400_000).toISOString();
  const { data, error } = await supabase
    .from("classroom_activities")
    .select("id, kind, name, starts_at, ends_at")
    .eq("classroom_id", classroomId)
    .gte("ends_at", since)
    .order("starts_at", { ascending: false });
  if (error) throw new Error(`No se pudo cargar la bitácora: ${error.message}`);
  return data;
}

export type Activity = Awaited<ReturnType<typeof listActivities>>[number];
