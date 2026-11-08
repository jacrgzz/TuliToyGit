// Prueba /demo y sus server actions como cada usuario demo (lee los ids del manifiesto de Next en modo dev).
// Requiere npm run dev corriendo, DEMO_MODE=true y datos provisionados. Corre: npm run check-demo
import { createServerClient } from "../../apps/web/node_modules/@supabase/ssr/dist/main/index.js";
const base = "http://localhost:3000";
const strip = (h) => h.replace(/<script[\s\S]*?<\/script>/g, "").replace(/<style[\s\S]*?<\/style>/g, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

async function login(email) {
  const jar = new Map();
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: { getAll: () => [...jar].map(([name, value]) => ({ name, value })), setAll: (i) => i.forEach(({ name, value }) => jar.set(name, value)) },
  });
  const { error } = await supabase.auth.signInWithPassword({ email, password: process.env.DEMO_PASSWORD });
  if (error) throw new Error(email + ": " + error.message);
  return { supabase, cookie: [...jar].map(([n, v]) => `${n}=${v}`).join("; ") };
}

// IDs de las server actions desde el manifiesto de Next (modo dev)
import { readFileSync } from "node:fs";
async function actionIds(cookie) {
  const man = JSON.parse(readFileSync(new URL("../../apps/web/.next/dev/server/server-reference-manifest.json", import.meta.url), "utf8"));
  const ids = {};
  for (const [id, v] of Object.entries(man.node ?? {})) ids[v.exportedName] = id;
  const html = await (await fetch(base + "/demo", { headers: { cookie } })).text();
  return { ids, html };
}
const call = async (cookie, id, args) => {
  const res = await fetch(base + "/demo", { method: "POST", headers: { cookie, "Next-Action": id, "Content-Type": "text/plain;charset=UTF-8", Accept: "text/x-component" }, body: JSON.stringify(args) });
  return `${res.status} ${(await res.text()).replace(/\s+/g, " ").slice(0, 160)}`;
};

for (const email of ["padre1@tuli.test", "padre2@tuli.test"]) {
  const u = await login(email);
  const devs = ((await u.supabase.from("devices").select("device_id")).data ?? []).map((d) => d.device_id).sort();
  console.log(`\n== ${email}\n  dispositivos visibles: ${devs.join(", ")}`);
  const { ids, html } = await actionIds(u.cookie);
  console.log("  /demo contiene 'Presionar el juguete':", strip(html).includes("Presionar el juguete") || html.includes("Presionar el juguete"));
  console.log("  action ids encontrados:", Object.keys(ids).join(", ") || "(ninguno)");
  if (ids.sendDemoPress) console.log("  sendDemoPress →", await call(u.cookie, ids.sendDemoPress, []));
  if (ids.sendDemoReading) console.log("  sendDemoReading →", await call(u.cookie, ids.sendDemoReading, [{ noise_avg: 55, noise_peak: 62, light_lux: 640, temp_c: 24, humidity_pct: 48 }]));
  if (ids.sendDemoReading) console.log("  sendDemoReading fuera de rango →", await call(u.cookie, ids.sendDemoReading, [{ noise_avg: 55, noise_peak: 999, light_lux: 640, temp_c: 24, humidity_pct: 48 }]));
}
// Sin sesión
const anon = await fetch(base + "/demo", { redirect: "manual" });
console.log("\n/demo sin sesión →", anon.status, anon.headers.get("location"));
