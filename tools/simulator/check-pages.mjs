// Pide las páginas del dashboard como cada usuario demo y muestra lo que ven.
// Requiere npm run dev corriendo y npm run provision. Corre: npm run check-pages
import { createServerClient } from "../../apps/web/node_modules/@supabase/ssr/dist/main/index.js";

const base = "http://localhost:3000";
const strip = (html) => html.replace(/<script[\s\S]*?<\/script>/g, "").replace(/<style[\s\S]*?<\/style>/g, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

async function session(email) {
  const jar = new Map();
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: { getAll: () => [...jar].map(([name, value]) => ({ name, value })), setAll: (i) => i.forEach(({ name, value }) => jar.set(name, value)) },
  });
  const { error } = await supabase.auth.signInWithPassword({ email, password: process.env.DEMO_PASSWORD });
  if (error) throw new Error(`login ${email}: ${error.message}`);
  return { supabase, cookie: [...jar].map(([n, v]) => `${n}=${v}`).join("; ") };
}
const get = async (cookie, path) => {
  const res = await fetch(base + path, { headers: { cookie }, redirect: "manual" });
  return { status: res.status, location: res.headers.get("location"), text: strip(await res.text()) };
};
const show = (label, r, n = 700) => console.log(`\n== ${label} → ${r.status}${r.location ? " → " + r.location : ""}\n${r.text.slice(0, n)}`);

const p1 = await session("padre1@tuli.test");
const p2 = await session("padre2@tuli.test");
const t = await session("docente@tuli.test");

const kidA = (await p1.supabase.from("children").select("id").single()).data.id;
const kidB = (await p2.supabase.from("children").select("id").single()).data.id;
const evA = (await p1.supabase.from("toy_events").select("id").order("occurred_at", { ascending: false }).limit(1)).data[0].id;

show("padre1 /dashboard", await get(p1.cookie, "/dashboard"));
show("padre1 /dashboard/ninos/A", await get(p1.cookie, `/dashboard/ninos/${kidA}`), 1800);
show("padre1 /dashboard/eventos/A", await get(p1.cookie, `/dashboard/eventos/${evA}`), 1500);
show("padre2 (otro padre) → niño A", await get(p2.cookie, `/dashboard/ninos/${kidA}`), 300);
show("padre2 (otro padre) → evento A", await get(p2.cookie, `/dashboard/eventos/${evA}`), 300);
show("padre2 /dashboard/ninos/B (sin eventos)", await get(p2.cookie, `/dashboard/ninos/${kidB}`), 1200);
show("docente /dashboard", await get(t.cookie, "/dashboard"), 1200);
show("docente → niño A", await get(t.cookie, `/dashboard/ninos/${kidA}`), 400);
show("ruta inválida", await get(p1.cookie, "/dashboard/ninos/no-es-uuid"), 200);
show("evento inválido", await get(p1.cookie, "/dashboard/eventos/abc"), 200);

// ---- Superusuario (admin) ----
const adm = await session("admin@tuli.test");
const roomId = (await adm.supabase.from("classrooms").select("id").limit(1).single()).data.id;
show("ADMIN /dashboard", await get(adm.cookie, "/dashboard"), 3800);
show("ADMIN /dashboard/salones/<salón>", await get(adm.cookie, `/dashboard/salones/${roomId}`), 700);
show("ADMIN → niño A", await get(adm.cookie, `/dashboard/ninos/${kidA}`), 300);
show("ADMIN → evento A", await get(adm.cookie, `/dashboard/eventos/${evA}`), 300);
show("padre1 → /dashboard/salones (no debe ver nada)", await get(p1.cookie, `/dashboard/salones/${roomId}`), 300);
show("docente → /dashboard/salones/<su salón>", await get(t.cookie, `/dashboard/salones/${roomId}`), 300);
