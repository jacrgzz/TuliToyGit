// Limpieza de los datos que crean las PRUEBAS (check-ingest, check-realtime, check-demo).
// Las pruebas insertan pulsaciones y lecturas "de ahora" con ambiente normal; si se quedaran, cada
// corrida de verify diluiría los perfiles simulados y las pruebas de exactitud (check-insights)
// se volverían inestables con el tiempo. Borra solo lo recibido DESDE que empezó la prueba.
import { createClient } from "@supabase/supabase-js";

export function startCleanup() {
  const sinceISO = new Date().toISOString();
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
  return async function cleanup() {
    const ev = await admin.from("toy_events").delete({ count: "exact" }).gte("received_at", sinceISO);
    const rd = await admin.from("sensor_readings").delete({ count: "exact" }).gte("received_at", sinceISO);
    if (ev.error || rd.error) {
      console.error(`⚠ no se pudo limpiar los datos de prueba: ${ev.error?.message ?? rd.error?.message}`);
      return;
    }
    console.log(`(limpieza: ${ev.count ?? 0} pulsaciones y ${rd.count ?? 0} lecturas de prueba borradas)`);
  };
}
