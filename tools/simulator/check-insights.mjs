// Prueba de EXACTITUD de los análisis del docente con datos simulados de perfil conocido.
// Requiere haber generado historia: npm run history -- --days 5 (con npm run dev corriendo).
// Alumno A se simuló sensible al ruido y Alumno B a los cambios bruscos de luz: si el análisis
// no los encuentra, el cálculo está mal. Corre: npm run check-insights
//
// No está en verify:all porque depende de la forma de los datos simulados; córrelo cuando
// cambies las funciones de análisis o el simulador.
import { createClient } from "@supabase/supabase-js";

const DAYS = 7;
const P = { p_noise: 75, p_noise_avg: 60, p_light_swing: 500, p_light_high: 1000, p_temp_high: 26, p_hum_high: 60 };

let failures = 0;
const check = (ok, label) => {
  console.log(`${ok ? "✔" : "✘"} ${label}`);
  if (!ok) failures++;
};

async function login(email) {
  const c = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  const { error } = await c.auth.signInWithPassword({ email, password: process.env.DEMO_PASSWORD });
  if (error) {
    console.error(`✘ login ${email}: ${error.message}`);
    process.exit(1);
  }
  return c;
}

const teacher = await login("docente@tuli.test");
const kids = (await teacher.from("children").select("id, display_name, classroom_id").order("display_name")).data ?? [];
const byName = Object.fromEntries(kids.map((k) => [k.display_name, k]));
const room = kids[0]?.classroom_id;

const fmt = (r) => `${r.condition}: ${r.events_with}/${r.events_total} momentos (${r.event_pct}%) vs ${r.baseline_pct}% base → ${r.lift ?? "—"}× [Wilson ${r.wilson_low}–${r.wilson_high}]`;

for (const name of ["Alumno A", "Alumno B"]) {
  const { data, error } = await teacher.rpc("child_condition_lift", { p_child: byName[name].id, p_days: DAYS, ...P });
  console.log(`\n# ${name}`);
  if (error) { check(false, `child_condition_lift: ${error.message}`); continue; }
  for (const r of data) console.log("  " + fmt(r));
  check(data.length === 6, "devuelve las 6 condiciones");
  check(data.every((r) => r.baseline_total > 100), "la línea base tiene suficientes ventanas");
}

console.log("\n# Perfiles del salón (lo que ve el docente)");
const { data: profiles, error } = await teacher.rpc("classroom_profiles", { p_classroom: room, p_days: DAYS, ...P, p_min_events: 5, p_min_lift: 1.5 });
check(!error, `classroom_profiles responde${error ? `: ${error.message}` : ""}`);
for (const p of profiles ?? []) console.log(`  ${p.display_name}: ${p.events_period} momentos · condición principal ${p.top_condition ?? "—"} (${p.top_lift ?? "—"}×, Wilson inf. ${p.top_wilson_low ?? "—"}% vs base ${p.top_baseline_pct ?? "—"}%)`);
const pa = profiles?.find((p) => p.display_name === "Alumno A");
const pb = profiles?.find((p) => p.display_name === "Alumno B");
check(pa?.top_condition === "ruido_pico" || pa?.top_condition === "ruido_sostenido", "Alumno A (simulado sensible al ruido) sale con una condición de ruido");
check(pb?.top_condition === "luz_brusca", "Alumno B (simulado sensible a la luz) sale con cambio brusco de luz");
check(pa && Number(pa.top_wilson_low) > Number(pa.top_baseline_pct), "en Alumno A el límite inferior de Wilson supera la línea base (evidencia alta)");
check(pb && Number(pb.top_wilson_low) > Number(pb.top_baseline_pct), "en Alumno B el límite inferior de Wilson supera la línea base (evidencia alta)");

console.log("\n# Curva antes y después (Alumno A)");
const { data: curve } = await teacher.rpc("child_event_curve", { p_child: byName["Alumno A"].id, p_days: DAYS, p_before_min: 10, p_after_min: 5, p_bucket_s: 30 });
const before = (curve ?? []).filter((c) => c.offset_s >= -180 && c.offset_s < 0);
const far = (curve ?? []).filter((c) => c.offset_s <= -420);
const avg = (xs) => xs.reduce((a, c) => a + Number(c.noise_avg), 0) / Math.max(xs.length, 1);
console.log(`  ruido promedio 7-10 min antes: ${avg(far).toFixed(1)} dB · 0-3 min antes: ${avg(before).toFixed(1)} dB · banda del salón ${curve?.[0]?.baseline_p25}–${curve?.[0]?.baseline_p75} dB`);
check((curve ?? []).length > 20, "la curva tiene tramos de −10 a +5 min");
check(avg(before) > avg(far) + 3, "el ruido sube en los minutos previos a los momentos de Alumno A");

console.log(failures === 0 ? "\n✔ Los análisis encuentran los perfiles simulados" : `\n✘ ${failures} verificación(es) fallaron`);
process.exit(failures === 0 ? 0 : 1);
