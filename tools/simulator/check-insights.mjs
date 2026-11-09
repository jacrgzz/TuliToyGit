// Prueba de EXACTITUD de los análisis del docente con datos simulados de perfil conocido.
// Requiere haber generado historia: npm run history -- --days 5 (con npm run dev corriendo).
// Alumno A se simuló sensible al ruido y Alumno B a los cambios bruscos de luz: si el análisis
// no los encuentra, el cálculo está mal. Corre: npm run check-insights
//
// No está en verify:all porque depende de la forma de los datos simulados; córrelo cuando
// cambies las funciones de análisis o el simulador.
import { createClient } from "@supabase/supabase-js";

const DAYS = 30;
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

console.log("\n# Fase 2: horarios, episodios, tendencia y salón");
const heatB = (await teacher.rpc("child_hourly_heatmap", { p_child: byName["Alumno B"].id, p_days: DAYS })).data ?? [];
const hoursB = {};
for (const h of heatB) hoursB[h.hour] = (hoursB[h.hour] ?? 0) + Number(h.events);
const totalB = Object.values(hoursB).reduce((a, b) => a + b, 0);
const midday = (hoursB[11] ?? 0) + (hoursB[12] ?? 0);
console.log(`  Alumno B: ${midday} de ${totalB} momentos entre 11 y 13 h (${Math.round((100 * midday) / totalB)} %)`);
check(midday / totalB > 0.35, "Alumno B (simulado con más momentos al mediodía) concentra momentos entre 11 y 13 h");

const epsA = (await teacher.rpc("child_episodes", { p_child: byName["Alumno A"].id, p_days: DAYS, p_gap_min: 10 })).data ?? [];
const pressesA = epsA.reduce((a, e) => a + Number(e.presses), 0);
console.log(`  Alumno A: ${pressesA} momentos en ${epsA.length} episodios`);
check(epsA.length > 0 && epsA.length < pressesA, "los episodios agrupan pulsaciones cercanas (menos episodios que momentos)");
check(epsA.every((e) => Number(e.duration_s) >= 0 && new Date(e.ended_at) >= new Date(e.started_at)), "cada episodio tiene duración válida");

const daily = (await teacher.rpc("child_daily_counts", { p_child: byName["Alumno A"].id, p_days: 14 })).data ?? [];
const noData = daily.filter((d) => Number(d.readings) === 0);
check(noData.length > 0 && noData.every((d) => d.events === null), "los días sin lecturas de la caja salen 'sin datos' (no cero)");
check(daily.every((d) => new Date(d.day + "T12:00:00Z").getUTCDay() % 6 !== 0), "la tendencia solo incluye días hábiles");

const nh = (await teacher.rpc("classroom_noise_heatmap", { p_classroom: room, p_days: DAYS, p_noise: 75 })).data ?? [];
const recess = nh.filter((r) => r.hour === 10);
const other = nh.filter((r) => r.hour !== 10 && r.hour >= 8 && r.hour <= 13);
const mean = (xs) => xs.reduce((a, r) => a + Number(r.high_pct), 0) / Math.max(xs.length, 1);
console.log(`  Ruido alto: ${mean(recess).toFixed(0)} % de lecturas a las 10 h (recreo simulado) vs ${mean(other).toFixed(0)} % en otras horas`);
check(mean(recess) > mean(other) * 2, "el recreo simulado (10:30 a 11:00) sale como la hora más ruidosa del salón");

const red = (await teacher.rpc("classroom_daily_red", { p_classroom: room, p_days: DAYS, p_noise: 75 })).data ?? [];
check(red.length > 0 && red.every((d) => Number(d.high_pct) >= 0 && Number(d.high_pct) <= 100), "la zona roja por día está entre 0 y 100 %");
const latest = (await teacher.rpc("classroom_latest_day", { p_classroom: room })).data;
const tl = (await teacher.rpc("classroom_day_timeline", { p_classroom: room, p_day: latest, p_bucket_min: 5 })).data ?? [];
check(!!latest && tl.length > 0, "la línea del día devuelve tramos de 5 min del último día con datos");

// Indicadores de "Hoy": deben coincidir con la zona roja por día (misma definición, días hábiles).
const stats = (await teacher.rpc("classroom_daily_stats", { p_classroom: room, p_days: DAYS, p_noise: 75, p_temp_low: 18, p_temp_high: 26, p_light_ok: 300 })).data ?? [];
const statsByDay = new Map(stats.map((d) => [d.day, d]));
const mismatches = red.filter((d) => Math.abs(Number(statsByDay.get(d.day)?.red_pct ?? -1) - Number(d.high_pct)) > 0.05);
check(stats.length > 0 && mismatches.length === 0, `classroom_daily_stats coincide con classroom_daily_red en ${red.length} días hábiles`);
const evTotal = stats.reduce((a, d) => a + Number(d.events), 0);
check(evTotal > 0 && stats.every((d) => d.temp_ok_pct === null || (Number(d.temp_ok_pct) >= 0 && Number(d.temp_ok_pct) <= 100)), `los indicadores diarios traen ${evTotal} momentos y porcentajes entre 0 y 100`);

console.log(failures === 0 ? "\n✔ Los análisis encuentran los perfiles simulados" : `\n✘ ${failures} verificación(es) fallaron`);
process.exit(failures === 0 ? 0 : 1);
