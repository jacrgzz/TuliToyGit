// Borra TODAS las pulsaciones, lecturas y el registro de ingesta, para empezar de cero con datos
// simulados limpios (después: npm run history). Solo para el proyecto de desarrollo con datos
// SIMULADOS. Exige --yes porque es destructivo.
//   npm run reset-data -- --yes
import { createClient } from "@supabase/supabase-js";

if (!process.argv.includes("--yes")) {
  console.error("Esto borra toy_events, sensor_readings e ingest_log (y las notas de eventos, por cascada).\nSi son solo datos simulados, corre: npm run reset-data -- --yes");
  process.exit(1);
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Falta NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en apps/web/.env.local");
  process.exit(1);
}
const admin = createClient(url, key, { auth: { persistSession: false } });

for (const table of ["toy_events", "sensor_readings", "ingest_log"] as const) {
  const { count, error } = await admin.from(table).delete({ count: "exact" }).gte("id", 0);
  if (error) {
    console.error(`✘ ${table}: ${error.message}`);
    process.exit(1);
  }
  console.log(`✔ ${table}: ${count ?? 0} filas borradas`);
}
