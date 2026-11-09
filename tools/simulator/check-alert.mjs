// Prueba de punta a punta del aviso en vivo por ruido alto (C2): lecturas reales entran por
// /api/ingest y el panel del docente debe mostrar el aviso, y quitarlo cuando el ruido baja.
// Limpia lo que crea. Requiere: npm run dev, datos provisionados. Corre: npm run check-alert
import { createServerClient } from "../../apps/web/node_modules/@supabase/ssr/dist/main/index.js";
import { startCleanup } from "./cleanup.mjs";

const base = process.env.APP_URL ?? "http://localhost:3000";
const BOX = process.env.BOX_DEVICE_TOKEN;
const cleanup = startCleanup();
let failures = 0;
const check = (ok, label) => {
  console.log(`${ok ? "✔" : "✘"} ${label}`);
  if (!ok) failures++;
};

const jar = new Map();
const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  cookies: { getAll: () => [...jar].map(([name, value]) => ({ name, value })), setAll: (i) => i.forEach(({ name, value }) => jar.set(name, value)) },
});
const { error } = await supabase.auth.signInWithPassword({ email: "docente@tuli.test", password: process.env.DEMO_PASSWORD });
if (error) {
  console.error(`✘ no se pudo iniciar sesión como docente: ${error.message}`);
  process.exit(1);
}
const cookie = [...jar].map(([n, v]) => `${n}=${v}`).join("; ");
const page = async () => (await (await fetch(base + "/dashboard", { headers: { cookie } })).text()).replace(/<script[\s\S]*?<\/script>/g, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

const seq0 = Date.now() * 1000;
let n = 0;
async function reading(secondsAgo, peak) {
  const res = await fetch(`${base}/api/ingest`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${BOX}` },
    body: JSON.stringify({
      type: "reading",
      device_id: "tuli-box-01",
      ts: new Date(Date.now() - secondsAgo * 1000).toISOString(),
      ts_source: "ntp",
      seq: seq0 + n++,
      window_s: 10,
      noise_avg: peak - 8,
      noise_peak: peak,
      light_lux: 640,
      temp_c: 24,
      humidity_pct: 48,
    }),
  });
  return res.status;
}

check(!(await page()).includes("Ruido alto en el salón ahora"), "sin lecturas recientes, no hay aviso");

// 6 lecturas con pico alto en el último minuto y medio
const statuses = [];
for (const s of [80, 65, 50, 35, 20, 5]) statuses.push(await reading(s, 90));
check(statuses.every((s) => s === 201), "las 6 lecturas de ruido alto entran por /api/ingest");
let html = await page();
check(html.includes("Ruido alto en el salón ahora"), "con ruido alto sostenido aparece el aviso en el panel del docente");
check(html.includes("lleva unos 2 minutos") && html.includes("75 dB"), "el aviso dice cuánto tiempo y el nivel, en lenguaje neutral");
check(!/ansiedad|crisis|diagn|trastorno/i.test(html.match(/Ruido alto en el salón ahora.{0,400}/)?.[0] ?? ""), "el aviso no usa lenguaje clínico");

// 4 lecturas tranquilas más recientes: 6 de 10 = 60 % < 80 %
for (const s of [4, 3, 2, 1]) await reading(s, 55);
html = await page();
check(!html.includes("Ruido alto en el salón ahora"), "cuando el ruido baja, el aviso desaparece");

await cleanup();
console.log(failures === 0 ? "\n✔ Aviso en vivo correcto" : `\n✘ ${failures} verificación(es) fallaron`);
process.exit(failures === 0 ? 0 : 1);
