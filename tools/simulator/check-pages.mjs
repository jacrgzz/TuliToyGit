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
check(!hasRenderError(r), "landing sin errores de render");
check(
  ["que-es", "como-funciona", "familias", "docentes", "privacidad", "preguntas"].every((id) => r.html.includes(`id="${id}"`)),
  "landing trae todas sus secciones en el HTML del servidor (se leen sin el 3D)",
);
check(r.html.includes('href="/login"') && !r.html.includes('href="#"'), "landing enlaza a /login y no tiene enlaces vacíos");
check(r.text.includes("No graba audio"), "landing dice que la caja no graba audio");
const model = await fetch(new URL("/models/landing/osito-v2.glb", base));
check(model.status === 200, "el modelo 3D del osito se sirve");
r = await get(null, "/login");
check(r.status === 200 && r.text.includes("Continuar con Google"), "login carga con el botón de Google");
r = await get(null, "/dashboard");
check(r.status === 307 && r.location?.endsWith("/login"), "/dashboard sin sesión redirige a /login");
r = await get(null, "/demo");
check(r.status === 307 && r.location?.endsWith("/login"), "/demo sin sesión redirige a /login");
r = await get(null, "/manifest.webmanifest");
check(r.status === 200 && r.text.includes('"Tuli"'), "manifest de la PWA disponible");
{
  const m = r.status === 200 ? JSON.parse(r.text) : {};
  check(m.background_color === "#efe9fb" && m.theme_color === "#6341c4", "manifest con el fondo lila y el morado de la marca");
  const urls = (m.shortcuts ?? []).map((s) => s.url);
  check(["/dashboard", "/dashboard/bitacora", "/pantalla"].every((u) => urls.includes(u)), "manifest con atajos a Hoy, Bitácora y Pantalla del salón");
}
r = await get(null, "/auth/callback");
check(r.status === 307 && r.location?.includes("error=oauth"), "callback sin código vuelve a /login con error");

const p1 = await session("padre1@tuli.test");
const p2 = await session("padre2@tuli.test");
const teacher = await session("docente@tuli.test");
const admin = await session("admin@tuli.test");

const kidA = (await p1.supabase.from("children").select("id").single()).data.id;
const kidB = (await p2.supabase.from("children").select("id").single()).data.id;
const roomId = (await admin.supabase.from("classrooms").select("id").eq("name", "Salón demo").single()).data.id;
const evA = (await p1.supabase.from("toy_events").select("id").order("occurred_at", { ascending: false }).limit(1)).data[0].id;

// ---- Tutor 1 ----
console.log("\n# Tutor (padre1)");
r = await get(p1.cookie, `/dashboard/ninos/${kidA}`);
check(r.status === 307 && r.location?.endsWith(`/dashboard/ninos/${kidA}/resumen`), "/dashboard/ninos/[id] redirige a la pestaña Resumen");
r = await get(p1.cookie, `/dashboard/ninos/${kidA}/resumen`);
check(r.status === 200 && !hasRenderError(r), "Hoy de su hijo carga sin errores de render");
check(r.text.includes("Alumno A") && r.text.includes("Cómo le va hoy") && r.text.includes("El salón hoy") && r.text.includes("Su juguete"), "Hoy (familia) muestra cómo le va, el salón y su juguete");
check(r.text.includes("Usar el juguete no es algo malo") && r.text.includes("El salón en este momento") && r.text.includes("Últimos momentos"), "Hoy (familia) aclara que usarlo no es malo y muestra el salón ahora y los últimos momentos");
check(/no es un dispositivo médico/i.test(r.text), "el panel conserva el aviso de que no es dispositivo médico");
check(!r.text.includes("Indicadores de hoy") && !r.text.includes("Lo que más coincide"), "la familia no ve los indicadores del salón ni el resumen técnico");
for (const [label, slug] of [["Hoy", "resumen"], ["Su semana", "semana"], ["Momentos", "momentos"], ["Reporte", "reporte"]]) {
  check(r.text.includes(label) && r.html.includes(`/dashboard/ninos/${kidA}/${slug}`), `la pestaña ${label} enlaza a la subruta ${slug}`);
}
check(!r.html.includes(`/dashboard/ninos/${kidA}/ajustes"`), "la familia no tiene la pestaña Ajustes");
r = await get(p1.cookie, `/dashboard/ninos/${kidA}/semana`);
check(r.status === 200 && !hasRenderError(r), "Su semana carga sin errores de render");
check(r.text.includes("Su semana") && r.text.includes("Lo que más coincidió") && r.text.includes("Para platicar con su maestra o maestro"), "Su semana muestra la semana, lo que coincidió y preguntas para el docente");
check(r.html.includes(`/dashboard/ninos/${kidA}/perfil`) && r.html.includes(`/dashboard/ninos/${kidA}/horarios`), "Su semana enlaza al análisis detallado");
check(!/ansiedad|diagn[oó]stico de|trastorno/i.test(r.text), "Su semana no usa lenguaje clínico");
r = await get(p1.cookie, "/dashboard/ayuda");
check(r.status === 200 && !hasRenderError(r) && r.text.includes("Para familias") && r.text.includes("Su juguete en casa"), "Ayuda muestra la sección para familias al tutor");
r = await get(teacher.cookie, "/dashboard/ayuda");
check(r.status === 200 && !r.text.includes("Para familias"), "el docente no ve la sección para familias");
check(r.html.includes('id="app"') && r.text.includes("Instalar Tuli como app") && r.text.includes("Agregar a inicio") && r.text.includes("inicia sesión una vez"), "Ayuda explica cómo instalar la app, también en iPhone");
r = await get(p1.cookie, `/dashboard/ninos/${kidA}/perfil`);
check(r.status === 200 && !hasRenderError(r), "Perfil carga sin errores de render");
check(r.text.includes("Perfil de sensibilidad") && r.text.includes("no indican la causa"), "Perfil muestra el perfil de sensibilidad y aclara que no son causas");
check(r.text.includes("Qué condiciones acompañan sus momentos") && r.text.includes("Picos de ruido"), "Perfil muestra las barras de condiciones");
check(r.text.includes("Ruido antes y después de sus momentos"), "Perfil muestra la curva antes y después");
r = await get(p1.cookie, `/dashboard/ninos/${kidA}/horarios`);
check(r.status === 200 && !hasRenderError(r), "Horarios carga sin errores de render");
check(r.text.includes("Cuándo ocurren sus momentos") && r.text.includes("Tendencia por día") && r.text.includes("Episodios"), "Horarios muestra horarios, tendencia y episodios");
check(r.text.includes("Día y hora") && /Lun|Mar/.test(r.text), "Horarios muestra el mapa de calor por día y hora");
r = await get(p1.cookie, `/dashboard/ninos/${kidA}/momentos`);
check(r.status === 200 && !hasRenderError(r) && r.text.includes("Momentos recientes"), "Momentos del niño carga y lista sus momentos");
r = await get(p1.cookie, `/dashboard/eventos/${evA}`);
check(r.status === 200 && !hasRenderError(r) && r.text.includes("Lecturas de la caja"), "detalle de su evento carga con las lecturas");
r = await get(p1.cookie, "/login");
check(r.status === 307 && r.location?.endsWith("/dashboard"), "con sesión, /login redirige a /dashboard");
r = await get(p1.cookie, `/dashboard/salones/${roomId}`);
check(!r.text.includes("Niños del salón") && !hasRenderError(r), "un tutor no ve la vista de salón");
for (const path of ["/dashboard/salon", "/dashboard/momentos", "/dashboard/bitacora"]) {
  r = await get(p1.cookie, path);
  check(!r.text.includes("Bitácora de actividades") && !r.text.includes("Perfiles del salón") && !r.text.includes("Cada momento es una pulsación del juguete de un niño del salón") && !hasRenderError(r), `un tutor no ve la página del docente ${path}`);
}
r = await get(p1.cookie, "/dashboard/ninos/no-es-uuid");
check(!r.text.includes("Condiciones del salón ahora") && !r.text.includes("Cómo le va hoy"), "id de niño inválido no muestra datos");
r = await get(p1.cookie, "/dashboard/eventos/abc");
check(!r.text.includes("Lecturas de la caja"), "id de evento inválido no muestra datos");

// ---- Fase 3a: formularios del docente y lo que NO ven los demás ----
console.log("\n# Fase 3a: bitácora, notas y ajustes");
r = await get(teacher.cookie, "/dashboard/bitacora");
check(r.text.includes("Bitácora de actividades") && r.text.includes("Agregar a la bitácora"), "docente ve la bitácora y su formulario");
r = await get(teacher.cookie, `/dashboard/ninos/${kidA}/ajustes`);
check(r.text.includes("Ajustes y cambios") && r.text.includes("Registrar el cambio"), "docente ve los ajustes y puede registrar un cambio");
r = await get(teacher.cookie, `/dashboard/eventos/${evA}`);
check(r.text.includes("Nota del docente") && r.text.includes("Fue una pulsación accidental"), "docente ve la nota y la marca de pulsación accidental");
r = await get(p1.cookie, `/dashboard/eventos/${evA}`);
check(!r.text.includes("Nota del docente") && !r.text.includes("Fue una pulsación accidental"), "el tutor NO ve la nota del docente ni la marca");
r = await get(p1.cookie, `/dashboard/ninos/${kidA}/ajustes`);
check(r.text.includes("Ajustes y cambios") && !r.text.includes("Registrar el cambio"), "el tutor ve los ajustes pero no el formulario para registrarlos");
r = await get(admin.cookie, `/dashboard/salones/${roomId}`);
check(r.text.includes("Bitácora de actividades") && !r.text.includes("Agregar a la bitácora"), "el admin ve la bitácora pero no puede escribir en ella");
r = await get(admin.cookie, `/dashboard/ninos/${kidA}/ajustes`);
check(!r.text.includes("Registrar el cambio"), "el admin no ve el formulario de ajustes");

// ---- Fase 3b: umbral, combinaciones, reporte, CSV, juguetes ----
console.log("\n# Fase 3b: umbral, combinaciones, reporte y juguetes");
r = await get(p1.cookie, `/dashboard/ninos/${kidA}/perfil`);
check(r.text.includes("Umbral personal de ruido") && r.text.includes("Ruido y luz juntos"), "Perfil muestra el umbral personal y las combinaciones");
check(r.html.includes(`/dashboard/ninos/${kidA}/reporte`), "las pestañas enlazan al reporte");
r = await get(p1.cookie, `/dashboard/ninos/${kidA}/reporte`);
check(r.status === 200 && !hasRenderError(r), "el reporte carga sin errores de render");
check(r.text.includes("Reporte de coincidencias: Alumno A") && r.text.includes("Cómo leer este reporte"), "el reporte trae el título y cómo leerlo");
check(r.text.includes("no es un dispositivo médico") && r.text.includes("no indican la causa"), "el reporte aclara que no es dispositivo médico ni causa");
check(r.text.includes("Descargar CSV") && r.text.includes("Imprimir o guardar como PDF"), "el reporte ofrece CSV e imprimir");
check(!r.text.includes("Nota del docente"), "el reporte no incluye notas del docente");
r = await get(p2.cookie, `/dashboard/ninos/${kidA}/reporte`);
check(!r.text.includes("Reporte de coincidencias") && !r.html.includes("Alumno A"), "padre2 NO ve el reporte del hijo de padre1");
r = await get(teacher.cookie, `/dashboard/ninos/${kidA}/reporte?dias=7`);
check(r.text.includes("Últimos 7 días"), "el reporte respeta el periodo (?dias=7)");

const csv = async (cookie, path) => {
  const res = await fetch(base + path, { headers: cookie ? { cookie } : {}, redirect: "manual" });
  const bytes = new Uint8Array(await res.arrayBuffer());
  // fetch().text() descarta el BOM al decodificar: se comprueba en los bytes crudos.
  const bom = bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf;
  return { status: res.status, type: res.headers.get("content-type"), disp: res.headers.get("content-disposition"), location: res.headers.get("location"), bom, text: new TextDecoder().decode(bytes) };
};
let c = await csv(p1.cookie, `/dashboard/ninos/${kidA}/reporte.csv?dias=30`);
check(c.status === 200 && /text\/csv/.test(c.type ?? ""), "padre1 descarga el CSV de su hijo");
check(/attachment; filename="tuli-alumno-a-30d\.csv"/.test(c.disp ?? ""), "el CSV se llama tuli-alumno-a-30d.csv");
check(c.bom && c.text.startsWith("fecha_hora_mexico,fuente_hora") && c.text.split("\r\n").length > 3, "el CSV trae BOM (para Excel), encabezado y filas");
check(!/ansiedad|nota/i.test(c.text.split("\r\n")[0]), "el CSV no incluye notas ni lenguaje clínico en el encabezado");
c = await csv(p2.cookie, `/dashboard/ninos/${kidA}/reporte.csv`);
check(c.status === 404 && !c.text.includes("fecha_hora_mexico"), "padre2 NO puede descargar el CSV del hijo de padre1 (404)");
c = await csv(null, `/dashboard/ninos/${kidA}/reporte.csv`);
check(c.status === 307 && c.location?.endsWith("/login"), "sin sesión, el CSV redirige a /login");
c = await csv(p1.cookie, "/dashboard/ninos/no-es-uuid/reporte.csv");
check(c.status === 404, "un id inválido en el CSV da 404");
c = await csv(teacher.cookie, `/dashboard/ninos/${kidA}/reporte.csv`);
check(c.status === 200, "el docente descarga el CSV de un niño de su salón");

r = await get(teacher.cookie, "/dashboard");
check(r.text.includes("Última señal del juguete"), "el docente ve la última señal del juguete de cada niño");
r = await get(teacher.cookie, "/dashboard/dispositivos");
check(r.status === 200 && !hasRenderError(r) && r.text.includes("Cajas de sensores") && r.text.includes("Juguetes") && r.text.includes("Última lectura"), "Dispositivos muestra las cajas y los juguetes");
check(!r.text.includes("Ruido alto en el salón ahora"), "sin ruido alto reciente, el panel no muestra aviso");

// ---- Aislamiento entre tutores ----
console.log("\n# Aislamiento (padre2 intenta ver lo de padre1)");
for (const tab of ["resumen", "semana", "perfil", "horarios", "momentos", "ajustes"]) {
  r = await get(p2.cookie, `/dashboard/ninos/${kidA}/${tab}`);
  check(!r.html.includes("Alumno A") && !r.text.includes("Condiciones del salón ahora") && !r.text.includes("Cómo le va hoy") && !r.text.includes("Lo que más coincidió") && !r.text.includes("Perfil de sensibilidad") && !r.text.includes("Registrar el cambio"), `padre2 no ve la pestaña ${tab} del hijo de padre1 (ni en el HTML)`);
}
r = await get(p2.cookie, `/dashboard/eventos/${evA}`);
check(!r.text.includes("Lecturas de la caja") && !r.text.includes("Condiciones en los"), "padre2 no ve el evento de padre1");
r = await get(p2.cookie, `/dashboard/ninos/${kidB}/perfil`);
check(r.status === 200 && !hasRenderError(r) && r.text.includes("Alumno B") && r.text.includes("Perfil de sensibilidad"), "padre2 ve el panel y el perfil de su propio hijo");
r = await get(p2.cookie, "/dashboard/ninos");
check(r.status === 200 && r.text.includes("Alumno B") && !r.html.includes("Alumno A") && !hasRenderError(r), "la lista Niños de padre2 solo trae a su hijo");
r = await get(p2.cookie, "/dashboard/reportes");
check(r.status === 200 && r.text.includes("Alumno B") && !r.html.includes("Alumno A") && !hasRenderError(r), "Reportes de padre2 solo trae a su hijo");

// ---- Docente ----
console.log("\n# Docente");
r = await get(teacher.cookie, "/dashboard");
check(r.status === 200 && !hasRenderError(r), "panel del salón carga sin errores de render");
check(r.text.includes("Hoy") && r.text.includes("Niños del salón") && r.text.includes("Alumno A") && r.text.includes("Alumno B"), "Hoy: el docente ve a los niños de su salón");
check(r.text.includes("Condiciones del salón ahora") && r.text.includes("Un día en el salón"), "Hoy: condiciones y línea del día");
console.log("\n# Docente: barra lateral y secciones");
check(r.html.includes('aria-label="Secciones"'), "la barra lateral tiene nombre accesible (nav Secciones)");
for (const [href, label] of [["/dashboard/salon", "Mi salón"], ["/dashboard/ninos", "Niños"], ["/dashboard/momentos", "Momentos"], ["/dashboard/bitacora", "Bitácora"], ["/dashboard/reportes", "Reportes"], ["/dashboard/dispositivos", "Dispositivos"], ["/dashboard/ayuda", "Cómo leer los datos"]]) {
  check(r.html.includes(`href="${href}"`) && r.text.includes(label), `la barra lateral del docente trae "${label}"`);
}
check(r.html.includes('aria-current="page"'), "la sección activa se marca con aria-current");
r = await get(teacher.cookie, "/dashboard/salon");
check(r.status === 200 && !hasRenderError(r) && r.text.includes("Perfiles del salón") && r.text.includes("Condición que más coincide"), "Mi salón: tabla de perfiles del salón");
check(r.text.includes("Cuándo es más ruidoso") && r.text.includes("Tiempo en zona roja por día"), "Mi salón: ruido por hora y zona roja");
r = await get(teacher.cookie, "/dashboard/salon?dias=7");
check(r.status === 200 && !hasRenderError(r), "Mi salón respeta el periodo (?dias=7)");
r = await get(teacher.cookie, "/dashboard/ninos");
check(r.status === 200 && !hasRenderError(r) && r.text.includes("Alumno A") && r.text.includes("Alumno B"), "Niños: lista a los niños del salón");
r = await get(teacher.cookie, "/dashboard/momentos");
check(r.status === 200 && !hasRenderError(r) && r.text.includes("Cada momento es una pulsación"), "Momentos: carga la lista de momentos del salón");
check(r.text.includes("Alumno A") || r.text.includes("Alumno B"), "Momentos: cada momento dice de qué niño es");
r = await get(teacher.cookie, "/dashboard/reportes");
check(r.status === 200 && !hasRenderError(r) && r.text.includes("Ver reporte") && r.html.includes(`/dashboard/ninos/${kidA}/reporte.csv`), "Reportes: enlaza al reporte y al CSV de cada niño");
r = await get(teacher.cookie, "/dashboard/ayuda");
check(r.status === 200 && !hasRenderError(r) && r.text.includes("Cómo leer los datos") && r.text.includes("no diagnostica") && r.text.includes("nunca graba ni envía audio"), "Ayuda: explica cómo leer los datos, que no diagnostica y que no se graba audio");
r = await get(teacher.cookie, "/dashboard");
r = await get(teacher.cookie, "/dashboard?dia=2026-11-04&dias=7");
check(r.status === 200 && !hasRenderError(r) && r.text.includes("Un día en el salón"), "docente puede elegir un día (?dia=) y un periodo (?dias=)");
r = await get(teacher.cookie, "/dashboard?dia=no-es-fecha");
check(r.status === 200 && !hasRenderError(r), "una fecha inválida en ?dia= se ignora sin romper la página");
r = await get(teacher.cookie, `/dashboard/salones/${roomId}`);
check(r.text.includes("Niños del salón") && !hasRenderError(r), "docente abre la vista de su salón");
r = await get(teacher.cookie, `/dashboard/ninos/${kidA}/resumen`);
check(r.text.includes("Alumno A") && r.text.includes("Niños") && !hasRenderError(r), "docente abre el panel de un niño de su salón");
check(r.text.includes("Condiciones del salón ahora") && r.text.includes("no indican la causa") && !r.text.includes("Cómo le va hoy"), "el docente sigue viendo el resumen técnico, no el de la familia");
for (const tab of ["Resumen", "Perfil", "Horarios", "Momentos", "Ajustes", "Reporte"]) {
  check(r.text.includes(tab) && r.html.includes(`/dashboard/ninos/${kidA}/${tab.toLowerCase()}`), `docente: la pestaña ${tab} enlaza a su subruta`);
}
r = await get(teacher.cookie, `/dashboard/ninos/${kidA}/resumen?dias=7`);
check(r.status === 200 && !hasRenderError(r) && r.text.includes("Últimos 7 días"), "el selector de periodo (?dias=7) funciona");

// ---- Indicadores de Hoy, selector de salón y pantalla del salón ----
console.log("\n# Docente: indicadores, resumen de la semana, selector de salón y pantalla");
r = await get(teacher.cookie, "/dashboard");
check(!hasRenderError(r) && r.text.includes("Indicadores de hoy") && r.text.includes("Esta semana"), "Hoy: indicadores y resumen de la semana");
for (const title of ["Momentos hoy", "Tiempo con ruido alto", "Temperatura en rango cómodo", "Luz suficiente", "Cobertura de datos"]) {
  check(r.text.includes(title), `Hoy: indicador "${title}"`);
}
check(r.html.includes('href="/dashboard/ayuda#indicadores"'), "Hoy: enlace '¿Por qué estos datos?' a la ayuda");
check(r.html.includes('href="/pantalla"') && r.html.includes('target="_blank"'), "la barra lateral trae 'Pantalla del salón' (abre otra pestaña)");
r = await get(teacher.cookie, "/dashboard/ayuda");
check(r.html.includes('id="indicadores"') && r.text.includes("Indicadores de hoy") && r.text.includes("Wargocki"), "Ayuda explica los indicadores con su fuente");
check(!/diagn[oó]stic[oa]s? de|causa(n|da)? /i.test(r.text.split("Qué NO es Tuli")[0]), "los textos de los indicadores no hablan de diagnóstico ni de causas");

const rooms = (await teacher.supabase.from("classrooms").select("id, name").order("name")).data ?? [];
const roomA = rooms.find((x) => x.name === "Salón demo");
const roomB = rooms.find((x) => x.name === "Salón demo B (vacío)");
check(rooms.length === 2 && !!roomA && !!roomB, "el docente demo tiene 2 salones");
r = await get(teacher.cookie, "/dashboard");
check(r.text.includes("Salón demo B (vacío)") && r.html.includes('name="id"'), "con 2 salones aparece el selector de salón en la barra lateral");
check(r.text.includes("Hoy · Salón demo") && r.text.includes("Alumno A"), "sin elegir, entra al primer salón");

const asRoom = (id) => `${teacher.cookie}; tuli_salon=${id}`;
r = await get(asRoom(roomB.id), "/dashboard");
check(!hasRenderError(r) && r.text.includes("Hoy · Salón demo B (vacío)") && r.text.includes("Este salón no tiene niños") && !r.text.includes("Alumno A"), "con el salón B elegido, Hoy muestra el salón vacío y no los niños del A");
for (const [path, absent] of [["/dashboard/ninos", "Alumno A"], ["/dashboard/momentos", "Alumno A"], ["/dashboard/reportes", "Alumno A"], ["/dashboard/dispositivos", "Alumno A"]]) {
  r = await get(asRoom(roomB.id), path);
  check(r.status === 200 && !hasRenderError(r) && !r.text.includes(absent), `con el salón B elegido, ${path} no muestra a los niños del salón A`);
}
r = await get(asRoom(roomB.id), "/dashboard/salon");
check(!hasRenderError(r) && r.text.includes("Mi salón · Salón demo B (vacío)"), "con el salón B elegido, Mi salón es el B");
r = await get(asRoom(roomB.id), "/dashboard/bitacora");
check(!hasRenderError(r) && r.text.includes("Agregar a la bitácora"), "con el salón B elegido, la bitácora es la del B");
r = await get(asRoom("00000000-0000-4000-8000-000000000000"), "/dashboard");
check(!hasRenderError(r) && r.text.includes("Hoy · Salón demo") && r.text.includes("Alumno A"), "una cookie con un salón que no existe o no es suyo se ignora (cae al primero)");
r = await get(`${p1.cookie}; tuli_salon=${roomB.id}`, "/dashboard");
check(!hasRenderError(r) && !r.text.includes("Salón demo B (vacío)") && !r.text.includes("Indicadores de hoy"), "la cookie del selector no cambia nada para un tutor");

r = await get(teacher.cookie, "/pantalla");
check(r.status === 200 && !hasRenderError(r) && r.text.includes("Ruido del salón") && r.text.includes("Pantalla completa"), "Pantalla del salón: el docente la ve con su botón de pantalla completa");
check(!r.text.includes("Alumno A") && !r.text.includes("Alumno B") && !r.text.includes("momento"), "Pantalla del salón: no muestra nombres ni momentos de ningún niño");
check(r.text.includes("No muestra datos de ningún niño"), "Pantalla del salón: avisa que no muestra datos de niños");
r = await get(asRoom(roomB.id), "/pantalla");
check(!hasRenderError(r) && r.text.includes("Salón demo B (vacío)") && r.text.includes("Sin datos recientes"), "Pantalla del salón vacío: dice 'Sin datos recientes' en vez de un color");
for (const [who, c] of [["un tutor", p1.cookie], ["el admin", admin.cookie]]) {
  r = await get(c, "/pantalla");
  check(!hasRenderError(r) && !r.text.includes("Ruido del salón") && !r.text.includes("Pantalla completa"), `${who} no ve la pantalla del salón`);
}
r = await get(null, "/pantalla");
check(r.status === 307 && r.location?.endsWith("/login"), "/pantalla sin sesión redirige a /login");

// ---- Admin ----
console.log("\n# Admin (solo lectura)");
r = await get(admin.cookie, "/dashboard");
check(r.status === 200 && !hasRenderError(r), "panel de administración carga sin errores de render");
for (const section of ["Panel de administración", "Resumen", "Salones y niños", "Dispositivos", "Usuarios", "Registro de ingesta", "Admin · solo lectura"]) {
  check(r.text.includes(section), `admin ve la sección "${section}"`);
}
r = await get(admin.cookie, `/dashboard/salones/${roomId}`);
check(r.text.includes("Niños del salón") && !hasRenderError(r), "admin abre la vista de salón");
r = await get(admin.cookie, `/dashboard/ninos/${kidA}/resumen`);
check(r.text.includes("Alumno A") && !hasRenderError(r), "admin abre el panel de cualquier niño");
check(r.text.includes("Admin · solo lectura"), "admin ve la insignia de solo lectura en la barra");
for (const path of ["/dashboard/salon", "/dashboard/momentos", "/dashboard/bitacora"]) {
  r = await get(admin.cookie, path);
  check(!r.text.includes("Agregar a la bitácora") && !hasRenderError(r), `el admin no ve la página del docente ${path} (usa /dashboard/salones/[id])`);
}
r = await get(admin.cookie, "/dashboard/dispositivos");
check(r.status === 200 && !hasRenderError(r) && r.text.includes("Cajas de sensores"), "admin ve Dispositivos");
r = await get(admin.cookie, `/dashboard/eventos/${evA}`);
check(r.text.includes("Lecturas de la caja") && !hasRenderError(r), "admin abre cualquier evento");

console.log(failures === 0 ? "\n✔ Páginas correctas" : `\n✘ ${failures} verificación(es) fallaron`);
process.exit(failures === 0 ? 0 : 1);
