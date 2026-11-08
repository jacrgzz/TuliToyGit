// Verifica que Realtime respeta RLS: el tutor recibe lo de su hijo y otro tutor no.
// Requiere npm run dev corriendo y datos provisionados. Corre: npm run check-realtime
import { createClient } from "@supabase/supabase-js";

const mk = async (email) => {
  const c = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  const { error } = await c.auth.signInWithPassword({ email, password: process.env.DEMO_PASSWORD });
  if (error) throw new Error(email + ": " + error.message);
  return c;
};
const listen = (client, name, got) =>
  new Promise((resolve, reject) => {
    client.channel(`rt-${name}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "toy_events" }, (p) => got.push(`${name}: toy_events seq=${p.new.seq}`))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "sensor_readings" }, (p) => got.push(`${name}: sensor_readings seq=${p.new.seq}`))
      .subscribe((s, err) => { if (s === "SUBSCRIBED") resolve(); if (s === "CHANNEL_ERROR" || s === "TIMED_OUT") reject(new Error(`${name}: ${s} ${err ?? ""}`)); });
  });

const got = [];
const p1 = await mk("padre1@tuli.test");
const p2 = await mk("padre2@tuli.test");
await Promise.all([listen(p1, "padre1", got), listen(p2, "padre2", got)]);
await new Promise((r) => setTimeout(r, 1500));
console.log("ambos suscritos");

const seq = Date.now();
const post = (token, body) => fetch("http://localhost:3000/api/ingest", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(body) }).then((r) => r.status);
const now = new Date().toISOString();
console.log("press (toy-01, hijo de padre1) →", await post(process.env.TOY_DEVICE_TOKEN, { type: "press", device_id: "tuli-toy-01", ts: now, ts_source: "ntp", seq }));
console.log("reading (caja del salón) →", await post(process.env.BOX_DEVICE_TOKEN, { type: "reading", device_id: "tuli-box-01", ts: now, ts_source: "ntp", seq, window_s: 10, noise_avg: 52, noise_peak: 61, light_lux: 640, temp_c: 24, humidity_pct: 48 }));
await new Promise((r) => setTimeout(r, 4000));
console.log("\nrecibido por Realtime:\n" + (got.sort().join("\n") || "(nada)"));
process.exit(0);
