import { createClient } from "@/lib/supabase/server";

// Estado de los juguetes visibles para el usuario (RLS). La batería y la última señal solo se
// actualizan con las pulsaciones y los latidos (type: heartbeat) que envía el firmware.
export async function listToyStatus() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("devices")
    .select("device_id, child_id, last_seen_at, battery_pct, battery_at")
    .eq("kind", "toy");
  if (error) throw new Error(`No se pudo cargar el estado de los juguetes: ${error.message}`);

  // Un niño puede tener más de un juguete (p. ej. el de demo): se toma el visto más recientemente.
  const byChild = new Map<string, { last_seen_at: string | null; battery_pct: number | null; battery_at: string | null; age_ms: number | null }>();
  for (const d of data) {
    if (!d.child_id) continue;
    const cur = byChild.get(d.child_id);
    const newer = !cur || (d.last_seen_at ?? "") > (cur.last_seen_at ?? "");
    if (newer) {
      byChild.set(d.child_id, {
        last_seen_at: d.last_seen_at,
        battery_pct: d.battery_pct,
        battery_at: d.battery_at,
        age_ms: d.last_seen_at ? Date.now() - new Date(d.last_seen_at).getTime() : null,
      });
    }
  }
  return byChild;
}

export type ToyStatusInfo = NonNullable<ReturnType<Awaited<ReturnType<typeof listToyStatus>>["get"]>>;
