// Verifica que Realtime respeta RLS: el tutor recibe lo de su hijo y otro tutor NO.
// Requiere: npm run dev corriendo y datos provisionados. Corre: npm run check-realtime
import { createClient } from "@supabase/supabase-js";

const base = process.env.APP_URL ?? "http://localhost:3000";
let failures = 0;
const check = (ok, label) => {
  console.log(`${ok ? "✔" : "✘"} ${label}`);
  if (!ok) failures++;
};

async function mk(email) {
  const c = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  const { error } = await c.auth.signInWithPassword({ email, password: process.env.DEMO_PASSWORD });
  if (error) {
    console.error(`✘ no se pudo iniciar sesión como ${email}: ${error.message}`);
    process.exit(1);
  }
  return c;
}

function listen(client, name, got) {
  return new Promise((resolve, reject) => {
    client
      .channel(`rt-${name}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "toy_events" }, (p) => got.push(`toy_events:${p.new.seq}`))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "sensor_readings" }, (p) => got.push(`sensor_readings:${p.new.seq}`))
      .subscribe((s, err) => {
        if (s === "SUBSCRIBED") resolve();
        if (s === "CHANNEL_ERROR" || s === "TIMED_OUT") reject(new Error(`${name}: ${s} ${err ?? ""}`));
      });
  });
}

const got1 = [];
const got2 = [];
const p1 = await mk("padre1@tuli.test");
const p2 = await mk("padre2@tuli.test");
await Promise.all([listen(p1, "padre1", got1), listen(p2, "padre2", got2)]);
// Realtime tarda un instante en registrar la suscripción después de decir SUBSCRIBED.
await new Promise((r) => setTimeout(r, 1500));

const seq = Date.now();
const now = new Date().toISOString();
const post = (token, body) =>
  fetch(`${base}/api/ingest`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  }).then((r) => r.status);

check((await post(process.env.TOY_DEVICE_TOKEN, { type: "press", device_id: "tuli-toy-01", ts: now, ts_source: "ntp", seq })) === 201, "la pulsación del juguete de padre1 se acepta (201)");
check(
  (await post(process.env.BOX_DEVICE_TOKEN, { type: "reading", device_id: "tuli-box-01", ts: now, ts_source: "ntp", seq, window_s: 10, noise_avg: 52, noise_peak: 61, light_lux: 640, temp_c: 24, humidity_pct: 48 })) === 201,
  "la lectura de la caja se acepta (201)",
);
// Espera hasta 15 s a que lleguen los mensajes esperados (con el servidor recién arrancado
// Realtime puede tardar más); luego 2 s extra para confirmar que a padre2 NO le llega lo ajeno.
const expected = [`toy_events:${seq}`, `sensor_readings:${seq}`];
for (let waited = 0; waited < 15000 && !expected.every((e) => got1.includes(e)); waited += 250) {
  await new Promise((r) => setTimeout(r, 250));
}
await new Promise((r) => setTimeout(r, 2000));

check(got1.includes(`toy_events:${seq}`), "padre1 recibe por Realtime la pulsación de su hijo");
check(got1.includes(`sensor_readings:${seq}`), "padre1 recibe por Realtime la lectura de su salón");
check(!got2.includes(`toy_events:${seq}`), "padre2 NO recibe la pulsación del hijo de padre1");
check(got2.includes(`sensor_readings:${seq}`), "padre2 sí recibe la lectura del salón compartido (por diseño)");

console.log(failures === 0 ? "\n✔ Realtime respeta RLS" : `\n✘ ${failures} verificación(es) fallaron`);
process.exit(failures === 0 ? 0 : 1);
