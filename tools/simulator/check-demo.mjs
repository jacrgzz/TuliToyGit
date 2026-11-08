// Prueba /demo y sus server actions con verificaciones que FALLAN si algo está mal.
// Lee los ids de las acciones del manifiesto de Next (solo existe con npm run dev).
// Requiere: npm run dev, DEMO_MODE=true y datos provisionados. Corre: npm run check-demo
import { readFileSync } from "node:fs";
import { createServerClient } from "../../apps/web/node_modules/@supabase/ssr/dist/main/index.js";

const base = process.env.APP_URL ?? "http://localhost:3000";
let failures = 0;
const check = (ok, label) => {
  console.log(`${ok ? "✔" : "✘"} ${label}`);
  if (!ok) failures++;
};

async function login(email) {
  const jar = new Map();
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: { getAll: () => [...jar].map(([name, value]) => ({ name, value })), setAll: (i) => i.forEach(({ name, value }) => jar.set(name, value)) },
  });
  const { error } = await supabase.auth.signInWithPassword({ email, password: process.env.DEMO_PASSWORD });
  if (error) {
    console.error(`✘ no se pudo iniciar sesión como ${email}: ${error.message}`);
    process.exit(1);
  }
  return { supabase, cookie: [...jar].map(([n, v]) => `${n}=${v}`).join("; ") };
}

// En un servidor recién arrancado el manifiesto de acciones aparece al compilar /demo: se pide primero.
const p1 = await login("padre1@tuli.test");
await fetch(base + "/demo", { headers: { cookie: p1.cookie } });

let ids = {};
try {
  const man = JSON.parse(readFileSync(new URL("../../apps/web/.next/dev/server/server-reference-manifest.json", import.meta.url), "utf8"));
  for (const [id, v] of Object.entries(man.node ?? {})) ids[v.exportedName] = id;
} catch {
  console.error("✘ No se encontró el manifiesto de acciones. Corre npm run dev y abre /demo una vez.");
  process.exit(1);
}
check(!!ids.sendDemoPress && !!ids.sendDemoReading, "se encontraron las server actions sendDemoPress y sendDemoReading");

// Next devuelve el resultado en formato flight: ... 1:{"ok":true}
async function call(cookie, id, args) {
  const res = await fetch(base + "/demo", {
    method: "POST",
    headers: { cookie, "Next-Action": id, "Content-Type": "text/plain;charset=UTF-8", Accept: "text/x-component" },
    body: JSON.stringify(args),
  });
  const text = await res.text();
  const m = text.match(/1:(\{"ok":(?:true|false)[^}]*\})/);
  return m ? JSON.parse(m[1]) : { ok: false, error: `respuesta inesperada (${res.status})` };
}

const reading = { noise_avg: 55, noise_peak: 62, light_lux: 640, temp_c: 24, humidity_pct: 48 };

console.log("\n# padre1 (tutor del niño con el juguete demo)");
const devs1 = ((await p1.supabase.from("devices").select("device_id")).data ?? []).map((d) => d.device_id);
check(devs1.includes("tuli-toy-demo") && devs1.includes("tuli-box-demo"), "ve los dispositivos demo (RLS)");
const page = await fetch(base + "/demo", { headers: { cookie: p1.cookie } });
const html = await page.text();
check(page.status === 200 && html.includes("Presionar el juguete") && !/\\?"digest\\?":\\?"\d+\\?"/.test(html), "/demo carga con el botón del juguete y sin errores de render");
let res = await call(p1.cookie, ids.sendDemoPress, []);
check(res.ok === true, "registra una pulsación");
res = await call(p1.cookie, ids.sendDemoReading, [reading]);
check(res.ok === true, "envía una lectura válida");
res = await call(p1.cookie, ids.sendDemoReading, [{ ...reading, noise_peak: 999 }]);
check(res.ok === false, "rechaza una lectura fuera de rango");

console.log("\n# padre2 (NO es tutor del niño del juguete demo)");
const p2 = await login("padre2@tuli.test");
const devs2 = ((await p2.supabase.from("devices").select("device_id")).data ?? []).map((d) => d.device_id);
check(!devs2.includes("tuli-toy-demo"), "no ve el juguete demo de otro niño (RLS)");
res = await call(p2.cookie, ids.sendDemoPress, []);
check(res.ok === false, "se le niega registrar pulsaciones con el juguete ajeno");

console.log("\n# Sin sesión");
const anon = await fetch(base + "/demo", { redirect: "manual" });
check(anon.status === 307 && anon.headers.get("location")?.endsWith("/login"), "/demo sin sesión redirige a /login");

console.log(failures === 0 ? "\n✔ Modo demo correcto" : `\n✘ ${failures} verificación(es) fallaron`);
process.exit(failures === 0 ? 0 : 1);
