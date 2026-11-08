import { createClient } from "@/lib/supabase/server";

// Última lectura de la caja de un salón (RLS: solo si el usuario puede ver ese salón).
export async function getLatestReading(classroomId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sensor_readings")
    .select(
      "measured_at, ts_source, window_s, noise_avg, noise_peak, light_lux, temp_c, humidity_pct",
    )
    .eq("classroom_id", classroomId)
    .order("measured_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`No se pudo cargar la última lectura: ${error.message}`);
  return data;
}

export type LatestReading = NonNullable<Awaited<ReturnType<typeof getLatestReading>>>;
