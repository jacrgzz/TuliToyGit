// Prueba las server actions del docente (bitácora, notas, ajustes) como cada rol, con verificaciones
// que FALLAN. Lee los ids de las acciones del manifiesto de Next (solo existe con npm run dev).
// Todo lo que crea lo borra. Requiere: npm run dev, datos provisionados. Corre: npm run check-actions
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

const teacher = await login("docente@tuli.test");
const p1 = await login("padre1@tuli.test");
const p2 = await login("padre2@tuli.test");

const kidA = (await p1.supabase.from("children").select("id").single()).data.id;
const roomId = (await teacher.supabase.from("classrooms").select("id").limit(1).single()).data.id;
const evId = (await p1.supabase.from("toy_events").select("id").order("occurred_at", { ascending: false }).limit(1)).data[0].id;

// En un servidor recién arrancado las acciones aparecen en el manifiesto al compilar las páginas que las usan.
for (const path of ["/dashboard", `/dashboard/ninos/${kidA}`, `/dashboard/eventos/${evId}`]) {
  await fetch(base + path, { headers: { cookie: teacher.cookie } });
}
const ids = {};
try {
  const man = JSON.parse(readFileSync(new URL("../../apps/web/.next/dev/server/server-reference-manifest.json", import.meta.url), "utf8"));
  for (const [id, v] of Object.entries(man.node ?? {})) ids[v.exportedName] = id;
} catch {
  console.error("✘ No se encontró el manifiesto de acciones. Corre npm run dev y abre el dashboard una vez.");
  process.exit(1);
}
for (const name of ["createActivity", "deleteActivity", "saveEventNote", "deleteEventNote", "createIntervention", "deleteIntervention"]) {
  check(!!ids[name], `se encontró la acción ${name}`);
}

async function call(user, name, ...args) {
  const res = await fetch(base + "/dashboard", {
    method: "POST",
    headers: { cookie: user.cookie, "Next-Action": ids[name], "Content-Type": "text/plain;charset=UTF-8", Accept: "text/x-component" },
    body: JSON.stringify(args),
  });
  const text = await res.text();
  const m = text.match(/1:(\{"ok":(?:true|false)[^\n]*\})/);
  return m ? JSON.parse(m[1]) : { ok: false, error: `respuesta inesperada (${res.status})` };
}

const activity = { classroomId: roomId, kind: "examen", name: "Prueba de acciones", starts: "2026-11-04T10:00", ends: "2026-11-04T10:45" };

console.log("\n# Bitácora de actividades");
let r = await call(teacher, "createActivity", activity);
check(r.ok === true, "el docente crea una actividad");
const row = (await teacher.supabase.from("classroom_activities").select("id, starts_at, ends_at, name").eq("name", "Prueba de acciones")).data ?? [];
check(row.length === 1 && row[0].starts_at.startsWith("2026-11-04T16:00"), "la hora de México (10:00) se guarda como UTC (16:00)");
r = await call(teacher, "createActivity", { ...activity, ends: "2026-11-04T09:00" });
check(r.ok === false && /después del inicio/.test(r.error ?? ""), "rechaza un fin anterior al inicio con un mensaje claro");
r = await call(teacher, "createActivity", { ...activity, kind: "juego" });
check(r.ok === false, "rechaza un tipo de actividad desconocido");
r = await call(p1, "createActivity", activity);
check(r.ok === false && /docente/.test(r.error ?? ""), "un tutor NO puede crear actividades");
if (row[0]) {
  r = await call(p1, "deleteActivity", row[0].id);
  check(r.ok === false, "un tutor NO puede borrar actividades");
  r = await call(teacher, "deleteActivity", row[0].id);
  check(r.ok === true, "el docente borra su actividad");
}
check(((await teacher.supabase.from("classroom_activities").select("id").eq("name", "Prueba de acciones")).data ?? []).length === 0, "no quedó ninguna actividad de prueba");

console.log("\n# Nota del docente y pulsación accidental");
r = await call(teacher, "saveEventNote", { eventId: evId, note: "primera", accidental: false });
check(r.ok === true, "el docente guarda una nota (inserta)");
r = await call(teacher, "saveEventNote", { eventId: evId, note: "segunda", accidental: true });
check(r.ok === true, "el docente la actualiza (misma nota, sin duplicar)");
const notes = (await teacher.supabase.from("event_notes").select("note, accidental").eq("event_id", evId)).data ?? [];
check(notes.length === 1 && notes[0].note === "segunda" && notes[0].accidental === true, "queda UNA nota con el último contenido");
r = await call(teacher, "saveEventNote", { eventId: evId, note: "x".repeat(501), accidental: false });
check(r.ok === false, "rechaza notas de más de 500 caracteres");
r = await call(p1, "saveEventNote", { eventId: evId, note: "hack", accidental: true });
check(r.ok === false, "un tutor NO puede escribir notas ni marcar accidentales");
r = await call(p2, "saveEventNote", { eventId: evId, note: "hack", accidental: true });
check(r.ok === false, "otro tutor NO puede escribir notas del hijo de un tercero");
const still = (await teacher.supabase.from("event_notes").select("note").eq("event_id", evId)).data ?? [];
check(still.length === 1 && still[0].note === "segunda", "los intentos de los tutores no cambiaron la nota");
r = await call(teacher, "deleteEventNote", evId);
check(r.ok === true, "el docente quita la nota");
check(((await teacher.supabase.from("event_notes").select("id").eq("event_id", evId)).data ?? []).length === 0, "no quedó ninguna nota de prueba");

console.log("\n# Ajustes (antes y después)");
const ajuste = { childId: kidA, title: "Prueba de acciones", startedOn: "2026-11-04", note: "" };
r = await call(teacher, "createIntervention", ajuste);
check(r.ok === true, "el docente registra un ajuste");
const iv = (await teacher.supabase.from("interventions").select("id").eq("title", "Prueba de acciones")).data ?? [];
check(iv.length === 1, "el ajuste quedó guardado");
r = await call(teacher, "createIntervention", { ...ajuste, startedOn: "04/11/2026" });
check(r.ok === false, "rechaza una fecha con formato inválido");
r = await call(p1, "createIntervention", ajuste);
check(r.ok === false, "un tutor NO puede registrar ajustes");
if (iv[0]) {
  r = await call(p1, "deleteIntervention", iv[0].id);
  check(r.ok === false, "un tutor NO puede quitar ajustes");
  r = await call(teacher, "deleteIntervention", iv[0].id);
  check(r.ok === true, "el docente quita el ajuste");
}
check(((await teacher.supabase.from("interventions").select("id").eq("title", "Prueba de acciones")).data ?? []).length === 0, "no quedó ningún ajuste de prueba");

console.log("\n# Sin sesión");
const anon = await fetch(base + "/dashboard", { method: "POST", redirect: "manual", headers: { "Next-Action": ids.createActivity, "Content-Type": "text/plain;charset=UTF-8" }, body: JSON.stringify([activity]) });
check(anon.status === 307 && anon.headers.get("location")?.endsWith("/login"), "sin sesión, invocar una acción redirige a /login");

console.log(failures === 0 ? "\n✔ Acciones del docente correctas" : `\n✘ ${failures} verificación(es) fallaron`);
process.exit(failures === 0 ? 0 : 1);
