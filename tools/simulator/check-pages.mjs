// Prueba las páginas como cada rol, con verificaciones que FALLAN si algo está mal.
// Requiere: npm run dev corriendo, npm run provision y datos (npm run simulate -- --backfill 30 --no-live).
// Corre: npm run check-pages   (código de salida 1 si algo falla)
import { createServerClient } from "../../apps/web/node_modules/@supabase/ssr/dist/main/index.js";

const base = process.env.APP_URL ?? "http://localhost:3000";
let failures = 0;
const check = (ok, label) => {
  console.log(`${ok ? "✔" : "✘"} ${label}`);
  if (!ok) failures++;
};

const strip = (html) =>
  html.replace(/<script[\s\S]*?<\/script>/g, "").replace(/<style[\s\S]*?<\/style>/g, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

async function session(email) {
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

async function get(cookie, path) {
  const res = await fetch(base + path, { headers: cookie ? { cookie } : {}, redirect: "manual" });
  const html = await res.text();
  return { status: res.status, location: res.headers.get("location"), html, text: strip(html) };
}
// Next deja el error de un componente dentro del HTML en streaming: f2:E{"digest":"487904453",...}.
// Los errores reales traen un digest NUMÉRICO; notFound() y redirect() usan texto
// ("NEXT_HTTP_ERROR_FALLBACK;404", "NEXT_REDIRECT") y NO son errores.
const hasRenderError = (r) => /\\?"digest\\?":\\?"\d+\\?"/.test(r.html) || r.html.includes("Application error");

// ---- Sin sesión ----
console.log("\n# Sin sesión");
let r = await get(null, "/");
check(r.status === 200 && r.text.includes("no es un dispositivo médico"), "landing carga y trae el aviso de que no es dispositivo médico");
r = await get(null, "/login");
check(r.status === 200 && r.text.includes("Continuar con Google"), "login carga con el botón de Google");
r = await get(null, "/dashboard");
check(r.status === 307 && r.location?.endsWith("/login"), "/dashboard sin sesión redirige a /login");
r = await get(null, "/demo");
check(r.status === 307 && r.location?.endsWith("/login"), "/demo sin sesión redirige a /login");
r = await get(null, "/manifest.webmanifest");
check(r.status === 200 && r.text.includes('"Tuli"'), "manifest de la PWA disponible");
r = await get(null, "/auth/callback");
check(r.status === 307 && r.location?.includes("error=oauth"), "callback sin código vuelve a /login con error");

const p1 = await session("padre1@tuli.test");
const p2 = await session("padre2@tuli.test");
const teacher = await session("docente@tuli.test");
const admin = await session("admin@tuli.test");

const kidA = (await p1.supabase.from("children").select("id").single()).data.id;
const kidB = (await p2.supabase.from("children").select("id").single()).data.id;
const roomId = (await admin.supabase.from("classrooms").select("id").limit(1).single()).data.id;
const evA = (await p1.supabase.from("toy_events").select("id").order("occurred_at", { ascending: false }).limit(1)).data[0].id;

// ---- Tutor 1 ----
console.log("\n# Tutor (padre1)");
r = await get(p1.cookie, `/dashboard/ninos/${kidA}`);
check(r.status === 200 && !hasRenderError(r), "panel de su hijo carga sin errores de render");
check(r.text.includes("Alumno A") && r.text.includes("Condiciones del salón ahora"), "panel muestra a su hijo y las condiciones");
check(r.text.includes("Perfil de sensibilidad") && r.text.includes("Momentos recientes"), "panel muestra el perfil de sensibilidad y los momentos");
check(r.text.includes("Qué condiciones acompañan sus momentos") && r.text.includes("Picos de ruido"), "panel muestra las barras de condiciones");
check(r.text.includes("Ruido antes y después de sus momentos"), "panel muestra la curva antes y después");
check(r.text.includes("no indican la causa"), "el perfil aclara que son coincidencias, no causas");
check(r.text.includes("Cuándo ocurren sus momentos") && r.text.includes("Tendencia por día") && r.text.includes("Episodios"), "panel muestra horarios, tendencia y episodios");
check(r.text.includes("Día y hora") && /Lun|Mar/.test(r.text), "panel muestra el mapa de calor por día y hora");
r = await get(p1.cookie, `/dashboard/ninos/${kidA}?dias=7`);
check(r.status === 200 && !hasRenderError(r) && r.text.includes("Últimos 7 días"), "el selector de periodo (?dias=7) funciona");
check(r.text.includes("no es un dispositivo médico"), "panel conserva el aviso de que no es dispositivo médico");
r = await get(p1.cookie, `/dashboard/eventos/${evA}`);
check(r.status === 200 && !hasRenderError(r) && r.text.includes("Lecturas de la caja"), "detalle de su evento carga con las lecturas");
r = await get(p1.cookie, "/login");
check(r.status === 307 && r.location?.endsWith("/dashboard"), "con sesión, /login redirige a /dashboard");
r = await get(p1.cookie, `/dashboard/salones/${roomId}`);
check(!r.text.includes("Niños del salón") && !hasRenderError(r), "un tutor no ve la vista de salón");
r = await get(p1.cookie, "/dashboard/ninos/no-es-uuid");
check(!r.text.includes("Condiciones del salón ahora"), "id de niño inválido no muestra datos");
r = await get(p1.cookie, "/dashboard/eventos/abc");
check(!r.text.includes("Lecturas de la caja"), "id de evento inválido no muestra datos");

// ---- Fase 3a: formularios del docente y lo que NO ven los demás ----
console.log("\n# Fase 3a: bitácora, notas y ajustes");
r = await get(teacher.cookie, "/dashboard");
check(r.text.includes("Bitácora de actividades") && r.text.includes("Agregar a la bitácora"), "docente ve la bitácora y su formulario");
r = await get(teacher.cookie, `/dashboard/ninos/${kidA}`);
check(r.text.includes("Ajustes y cambios") && r.text.includes("Registrar el cambio"), "docente ve los ajustes y puede registrar un cambio");
r = await get(teacher.cookie, `/dashboard/eventos/${evA}`);
check(r.text.includes("Nota del docente") && r.text.includes("Fue una pulsación accidental"), "docente ve la nota y la marca de pulsación accidental");
r = await get(p1.cookie, `/dashboard/eventos/${evA}`);
check(!r.text.includes("Nota del docente") && !r.text.includes("Fue una pulsación accidental"), "el tutor NO ve la nota del docente ni la marca");
r = await get(p1.cookie, `/dashboard/ninos/${kidA}`);
check(r.text.includes("Ajustes y cambios") && !r.text.includes("Registrar el cambio"), "el tutor ve los ajustes pero no el formulario para registrarlos");
r = await get(admin.cookie, `/dashboard/salones/${roomId}`);
check(r.text.includes("Bitácora de actividades") && !r.text.includes("Agregar a la bitácora"), "el admin ve la bitácora pero no puede escribir en ella");
r = await get(admin.cookie, `/dashboard/ninos/${kidA}`);
check(!r.text.includes("Registrar el cambio"), "el admin no ve el formulario de ajustes");

// ---- Aislamiento entre tutores ----
console.log("\n# Aislamiento (padre2 intenta ver lo de padre1)");
r = await get(p2.cookie, `/dashboard/ninos/${kidA}`);
check(!r.html.includes("Alumno A") && !r.text.includes("Condiciones del salón ahora") && !r.text.includes("Perfil de sensibilidad"), "padre2 no ve el panel ni el perfil del hijo de padre1 (ni en el HTML)");
r = await get(p2.cookie, `/dashboard/eventos/${evA}`);
check(!r.text.includes("Lecturas de la caja") && !r.text.includes("Condiciones en los"), "padre2 no ve el evento de padre1");
r = await get(p2.cookie, `/dashboard/ninos/${kidB}`);
check(r.status === 200 && !hasRenderError(r) && r.text.includes("Alumno B") && r.text.includes("Perfil de sensibilidad"), "padre2 ve el panel y el perfil de su propio hijo");

// ---- Docente ----
console.log("\n# Docente");
r = await get(teacher.cookie, "/dashboard");
check(r.status === 200 && !hasRenderError(r), "panel del salón carga sin errores de render");
check(r.text.includes("Niños del salón") && r.text.includes("Alumno A") && r.text.includes("Alumno B"), "docente ve a los niños de su salón");
check(r.text.includes("Perfiles del salón") && r.text.includes("Condición que más coincide"), "docente ve la tabla de perfiles del salón");
check(r.text.includes("Un día en el salón") && r.text.includes("Cuándo es más ruidoso") && r.text.includes("Tiempo en zona roja por día"), "docente ve la línea del día, el ruido por hora y la zona roja");
r = await get(teacher.cookie, "/dashboard?dia=2026-11-04&dias=7");
check(r.status === 200 && !hasRenderError(r) && r.text.includes("Un día en el salón"), "docente puede elegir un día (?dia=) y un periodo (?dias=)");
r = await get(teacher.cookie, "/dashboard?dia=no-es-fecha");
check(r.status === 200 && !hasRenderError(r), "una fecha inválida en ?dia= se ignora sin romper la página");
r = await get(teacher.cookie, `/dashboard/salones/${roomId}`);
check(r.text.includes("Niños del salón") && !hasRenderError(r), "docente abre la vista de su salón");
r = await get(teacher.cookie, `/dashboard/ninos/${kidA}`);
check(r.text.includes("Alumno A") && r.text.includes("Volver al panel"), "docente abre el panel de un niño de su salón");

// ---- Admin ----
console.log("\n# Admin (solo lectura)");
r = await get(admin.cookie, "/dashboard");
check(r.status === 200 && !hasRenderError(r), "panel de administración carga sin errores de render");
for (const section of ["Panel de administración", "Resumen", "Salones y niños", "Dispositivos", "Usuarios", "Registro de ingesta", "Admin · solo lectura"]) {
  check(r.text.includes(section), `admin ve la sección "${section}"`);
}
r = await get(admin.cookie, `/dashboard/salones/${roomId}`);
check(r.text.includes("Niños del salón") && !hasRenderError(r), "admin abre la vista de salón");
r = await get(admin.cookie, `/dashboard/ninos/${kidA}`);
check(r.text.includes("Alumno A") && !hasRenderError(r), "admin abre el panel de cualquier niño");
r = await get(admin.cookie, `/dashboard/eventos/${evA}`);
check(r.text.includes("Lecturas de la caja") && !hasRenderError(r), "admin abre cualquier evento");

console.log(failures === 0 ? "\n✔ Páginas correctas" : `\n✘ ${failures} verificación(es) fallaron`);
process.exit(failures === 0 ? 0 : 1);
