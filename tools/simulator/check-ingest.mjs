// Prueba HTTP de /api/ingest (el contrato v1 con el servidor real), con verificaciones que FALLAN.
// Requiere: npm run dev, npm run provision. Corre: npm run check-ingest
import { createClient } from "@supabase/supabase-js";
import { startCleanup } from "./cleanup.mjs";

const base = process.env.APP_URL ?? "http://localhost:3000";
const { TOY_DEVICE_TOKEN: TOY, BOX_DEVICE_TOKEN: BOX, NEXT_PUBLIC_SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: key } = process.env;
if (!TOY || !BOX || !url || !key) {
  console.error("Faltan tokens o claves en apps/web/.env.local. Corre npm run provision.");
  process.exit(1);
}
const admin = createClient(url, key, { auth: { persistSession: false } });
const cleanup = startCleanup();

let failures = 0;
const check = (ok, label) => {
  console.log(`${ok ? "✔" : "✘"} ${label}`);
  if (!ok) failures++;
};

async function post(token, body, raw) {
  const res = await fetch(`${base}/api/ingest`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: raw ?? JSON.stringify(body),
  });
  let json = null;
  try { json = await res.json(); } catch { /* sin cuerpo JSON */ }
  return { status: res.status, json };
}

const seq = Date.now() * 1000; // único por corrida
const now = () => new Date().toISOString();
const press = (n, extra = {}) => ({ type: "press", device_id: "tuli-toy-01", ts: now(), ts_source: "ntp", seq: seq + n, ...extra });
const reading = (n, extra = {}) => ({ type: "reading", device_id: "tuli-box-01", ts: now(), ts_source: "ntp", seq: seq + n, window_s: 10, noise_avg: 55, noise_peak: 70, light_lux: 650, temp_c: 24, humidity_pct: 48, ...extra });

console.log("# Autenticación");
let r = await post(null, press(1));
check(r.status === 401, "sin token → 401");
r = await post("token-falso", press(1));
check(r.status === 401, "token falso → 401");
r = await post(TOY, press(2, { device_id: "tuli-toy-02" }));
check(r.status === 401, "device_id del cuerpo distinto al del token → 401");

console.log("\n# Mensajes válidos");
r = await post(TOY, press(10));
check(r.status === 201 && r.json?.ok === true, "pulsación válida → 201");
r = await post(TOY, press(10));
check(r.status === 409 && r.json?.duplicate === true, "misma seq otra vez → 409 duplicate (idempotente)");
r = await post(BOX, reading(11));
check(r.status === 201, "lectura válida → 201");
r = await post(BOX, reading(12, { noise_avg: undefined, noise_peak: undefined, light_lux: undefined }));
check(r.status === 201, "lectura con solo algunos sensores → 201");

console.log("\n# Mensajes inválidos");
r = await post(BOX, reading(20, { temperature: 24 }));
check(r.status === 400 && Array.isArray(r.json?.issues) && r.json.issues.length > 0, "campo desconocido (typo) → 400 con la lista de problemas");
r = await post(BOX, reading(21, { humidity_pct: 150 }));
check(r.status === 400, "humedad fuera de rango → 400");
r = await post(BOX, press(22, { device_id: "tuli-box-01" }));
check(r.status === 400, "pulsación enviada por una caja → 400");
r = await post(TOY, reading(23, { device_id: "tuli-toy-01" }));
check(r.status === 400, "lectura enviada por un juguete → 400");
r = await post(TOY, null, '{"type":');
check(r.status === 400, "JSON roto → 400");
r = await post(TOY, null, JSON.stringify({ ...press(24), padding: "x".repeat(5000) }));
check(r.status === 400, "cuerpo mayor a 4096 bytes → 400");

console.log("\n# Batería (campo opcional battery_pct)");
r = await post(TOY, press(40, { battery_pct: 63.5 }));
check(r.status === 201, "pulsación con battery_pct válido → 201");
const { data: dev } = await admin.from("devices").select("battery_pct, battery_at").eq("device_id", "tuli-toy-01").single();
check(Number(dev?.battery_pct) === 63.5 && !!dev?.battery_at, "la batería se guarda en devices con su hora");
r = await post(TOY, press(41, { battery_pct: 101 }));
check(r.status === 400 && (r.json?.issues ?? []).some((i) => i.includes("battery_pct")), "battery_pct fuera de 0 a 100 → 400 y dice qué campo");
r = await post(TOY, press(42));
const { data: dev2 } = await admin.from("devices").select("battery_pct").eq("device_id", "tuli-toy-01").single();
check(r.status === 201 && Number(dev2?.battery_pct) === 63.5, "una pulsación sin battery_pct no borra la última batería conocida");

console.log("\n# Latido (heartbeat)");
const hb = (n, extra = {}) => ({ type: "heartbeat", device_id: "tuli-toy-01", ts: now(), ts_source: "ntp", seq: seq + n, ...extra });
const countRows = async () => ({
  ev: (await admin.from("toy_events").select("*", { count: "exact", head: true })).count,
  rd: (await admin.from("sensor_readings").select("*", { count: "exact", head: true })).count,
});
const rowsBefore = await countRows();
r = await post(TOY, hb(50, { battery_pct: 41.5 }));
check(r.status === 201, "latido válido → 201");
const { data: dev3 } = await admin.from("devices").select("battery_pct, last_seen_at").eq("device_id", "tuli-toy-01").single();
check(Number(dev3?.battery_pct) === 41.5 && Date.now() - new Date(dev3.last_seen_at).getTime() < 60_000, "el latido actualiza la batería y last_seen_at");
const rowsAfter = await countRows();
check(rowsAfter.ev === rowsBefore.ev && rowsAfter.rd === rowsBefore.rd, "el latido NO crea eventos ni lecturas");
r = await post(TOY, hb(51, { noise_avg: 50 }));
check(r.status === 400, "un latido con campos de sensor → 400");
r = await post(BOX, hb(52, { device_id: "tuli-box-01" }));
check(r.status === 201, "la caja también puede enviar latidos");

console.log("\n# Reglas de hora (se verifica en la base)");
const future = new Date(Date.now() + 10 * 60 * 1000).toISOString();
await post(TOY, press(30, { ts: future }));
await post(TOY, press(31, { ts: undefined, ts_source: undefined }));
await post(TOY, press(32, { ts_source: "unsynced" }));
const { data: rows } = await admin.from("toy_events").select("seq, ts_source").in("seq", [seq + 10, seq + 30, seq + 31, seq + 32]);
const src = Object.fromEntries((rows ?? []).map((x) => [Number(x.seq) - seq, x.ts_source]));
check(src[10] === "ntp", "ts válido con ntp se guarda como ntp");
check(src[30] === "unsynced", "ts 10 min en el futuro se guarda como unsynced");
check(src[31] === "server", "sin ts se guarda como server");
check(src[32] === "unsynced", "ts_source unsynced se respeta");

console.log("\n# Registro de ingesta (ingest_log)");
const { data: log } = await admin.from("ingest_log").select("outcome, status").order("received_at", { ascending: false }).limit(40);
const outcomes = new Set((log ?? []).map((l) => l.outcome));
for (const o of ["ok", "invalid", "unauthorized", "duplicate"]) check(outcomes.has(o), `ingest_log registró un resultado "${o}"`);

await cleanup();
console.log(failures === 0 ? "\n✔ /api/ingest cumple el contrato" : `\n✘ ${failures} verificación(es) fallaron`);
process.exit(failures === 0 ? 0 : 1);
