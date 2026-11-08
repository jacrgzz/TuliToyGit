// Prueba de políticas RLS contra el proyecto real, con usuarios de DEMO.
// Requiere haber corrido: npm run provision, y datos en toy_events/sensor_readings
// (npm run simulate -- --backfill 30 --no-live).
// Corre: npm run check-rls   (sale con código 1 si algo falla)

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const password = process.env.DEMO_PASSWORD;
if (!url || !anonKey || !password) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY o DEMO_PASSWORD. Corre npm run provision.");
  process.exit(1);
}

let failures = 0;
const check = (ok: boolean, label: string) => {
  console.log(`${ok ? "✔" : "✘"} ${label}`);
  if (!ok) failures++;
};

async function login(email: string) {
  const client = createClient(url!, anonKey!, { auth: { persistSession: false } });
  const { error } = await client.auth.signInWithPassword({ email, password: password! });
  if (error) {
    console.error(`✘ no se pudo iniciar sesión como ${email}: ${error.message}`);
    process.exit(1);
  }
  return client;
}

const anon = createClient(url, anonKey, { auth: { persistSession: false } });
const p1 = await login("padre1@tuli.test");
const p2 = await login("padre2@tuli.test");
const teacher = await login("docente@tuli.test");

// Anónimo no ve nada
for (const table of ["children", "toy_events", "sensor_readings", "devices", "profiles", "guardians"]) {
  const { data } = await anon.from(table).select("*").limit(5);
  check(!data || data.length === 0, `anon no ve ${table}`);
}

// Anónimo tampoco puede escribir (las políticas anon de insert del prototipo viejo no existen)
const anonInsEvent = await anon.from("toy_events").insert({ device_id: "x", child_id: "00000000-0000-0000-0000-000000000000", occurred_at: new Date().toISOString(), ts_source: "ntp", seq: 1 });
check(!!anonInsEvent.error, "anon no puede insertar en toy_events");
const anonInsReading = await anon.from("sensor_readings").insert({ device_id: "x", classroom_id: "00000000-0000-0000-0000-000000000000", measured_at: new Date().toISOString(), ts_source: "ntp", seq: 1 });
check(!!anonInsReading.error, "anon no puede insertar en sensor_readings");
const anonInsRoom = await anon.from("classrooms").insert({ name: "hack" });
check(!!anonInsRoom.error, "anon no puede insertar en classrooms");

// Padre 1 solo ve a su hijo
const kids1 = (await p1.from("children").select("display_name")).data ?? [];
check(kids1.length === 1 && kids1[0].display_name === "Alumno A", "padre1 ve solo a Alumno A");
const kids2 = (await p2.from("children").select("display_name")).data ?? [];
check(kids2.length === 1 && kids2[0].display_name === "Alumno B", "padre2 ve solo a Alumno B");

// Docente ve a los dos niños del salón
const kidsT = (await teacher.from("children").select("display_name")).data ?? [];
check(kidsT.length === 2, "docente ve a los 2 niños de su salón");

// Eventos: cada padre solo los de su hijo
const ev1 = (await p1.from("toy_events").select("device_id")).data ?? [];
check(ev1.length > 0 && ev1.every((e) => e.device_id === "tuli-toy-01" || e.device_id === "tuli-toy-demo"), `padre1 ve sus eventos y solo los de los juguetes de su hijo (${ev1.length})`);
const ev2 = (await p2.from("toy_events").select("device_id")).data ?? [];
check(ev2.every((e) => e.device_id === "tuli-toy-02"), `padre2 no ve eventos del hijo de padre1 (${ev2.length})`);

// Contexto de eventos con RLS (vista security_invoker)
const ctx1 = (await p1.from("event_context").select("child_id")).data ?? [];
const kidA = kids1.length ? (await p1.from("children").select("id").single()).data?.id : null;
check(ctx1.length > 0 && ctx1.every((r) => r.child_id === kidA), `padre1 ve contexto y solo de su hijo (${ctx1.length} filas)`);
const ctx2 = (await p2.from("event_context").select("child_id")).data ?? [];
check(ctx2.every((r) => r.child_id !== kidA), "padre2 no ve contexto del hijo de padre1");

// Padres ven las lecturas del salón de su hijo (ambiente, no identifica a nadie)
const rd1 = (await p1.from("sensor_readings").select("device_id").limit(1)).data ?? [];
check(rd1.length === 1 && rd1[0].device_id === "tuli-box-01", "padre1 ve lecturas de la caja de su salón");
const rdT = (await teacher.from("sensor_readings").select("device_id").limit(1)).data ?? [];
check(rdT.length === 1, "docente ve lecturas de la caja de su salón");

// El hash del token nunca se expone
const tok = await p1.from("devices").select("token_hash").limit(1);
check(!!tok.error, "token_hash no es legible por usuarios");
const dev = await p1.from("devices").select("device_id, kind");
check((dev.data ?? []).every((d) => d.device_id !== "tuli-toy-02"), "padre1 no ve el juguete de otro niño");

// Escrituras bloqueadas
const ins = await p1.from("toy_events").insert({ device_id: "tuli-toy-01", child_id: kidA, occurred_at: new Date().toISOString(), ts_source: "ntp", seq: 1 });
check(!!ins.error, "usuarios no pueden insertar eventos");
const upd = await p1.from("children").update({ display_name: "hack" }).eq("display_name", "Alumno A").select();
check(!!upd.error || (upd.data ?? []).length === 0, "usuarios no pueden modificar niños");
const log = await teacher.from("ingest_log").select("*").limit(1);
check(!!log.error || (log.data ?? []).length === 0, "usuarios no ven ingest_log");

// Un padre no se agrega a sí mismo como tutor de otro niño
const sneaky = await p1.from("guardians").insert({ profile_id: (await p1.auth.getUser()).data.user!.id, child_id: (await p2.from("children").select("id").single()).data?.id });
check(!!sneaky.error, "un padre no puede vincularse al hijo de otro");

// ---- Funciones de análisis del docente (security invoker: respetan RLS) ----
const LP = { p_noise: 75, p_noise_avg: 60, p_light_swing: 500, p_light_high: 1000, p_temp_high: 26, p_hum_high: 60 };
const kidAId = kidA;
const liftOwn = (await p1.rpc("child_condition_lift", { p_child: kidAId, p_days: 30, ...LP })).data ?? [];
check(liftOwn.some((r) => r.events_total > 0), "padre1 obtiene el perfil de sensibilidad de su hijo");
const liftOther = (await p2.rpc("child_condition_lift", { p_child: kidAId, p_days: 30, ...LP })).data ?? [];
check(liftOther.length === 6 && liftOther.every((r) => r.events_total === 0 && r.baseline_total === 0), "padre2 NO obtiene el perfil del hijo de padre1 (solo ceros)");
const curveOther = (await p2.rpc("child_event_curve", { p_child: kidAId, p_days: 30 })).data ?? [];
check(curveOther.length === 0, "padre2 NO obtiene la curva del hijo de padre1");
const roomOfA = (await teacher.from("children").select("classroom_id").eq("id", kidAId).single()).data?.classroom_id;
const profT = (await teacher.rpc("classroom_profiles", { p_classroom: roomOfA, p_days: 30, ...LP, p_min_events: 5, p_min_lift: 1.5 })).data ?? [];
check(profT.length >= 2, `docente obtiene los perfiles de su salón (${profT.length})`);
const profP2 = (await p2.rpc("classroom_profiles", { p_classroom: roomOfA, p_days: 30, ...LP, p_min_events: 5, p_min_lift: 1.5 })).data ?? [];
check(profP2.every((p) => p.display_name !== "Alumno A"), "padre2 no ve el perfil de Alumno A en los perfiles del salón");
const anonLift = await anon.rpc("child_condition_lift", { p_child: kidAId, p_days: 30, ...LP });
check(!!anonLift.error || (anonLift.data ?? []).every((r) => r.events_total === 0), "anon no puede usar las funciones de análisis");

// ---- Superusuario (admin): ve todo, pero solo lee ----
const adminC = await login("admin@tuli.test");
const aKids = (await adminC.from("children").select("id")).data ?? [];
check(aKids.length >= 2, `admin ve todos los niños (${aKids.length})`);
const aRooms = (await adminC.from("classrooms").select("id")).data ?? [];
check(aRooms.length >= 1, `admin ve todos los salones (${aRooms.length})`);
const aEv = (await adminC.from("toy_events").select("device_id")).data ?? [];
check(aEv.length >= ev1.length && aEv.length > 0, `admin ve todos los eventos (${aEv.length})`);
const aCtx = (await adminC.from("event_context").select("event_id").limit(1)).data ?? [];
check(aCtx.length === 1, "admin ve event_context");
const aSum = (await adminC.from("event_summary").select("event_id").limit(1)).data ?? [];
check(aSum.length === 1, "admin ve event_summary");
const aProfiles = (await adminC.from("profiles").select("email")).data ?? [];
check(aProfiles.length >= 4 && aProfiles.every((p) => p.email), `admin ve los perfiles con correo (${aProfiles.length})`);
const aGuard = (await adminC.from("guardians").select("child_id")).data ?? [];
check(aGuard.length >= 2, "admin ve los vínculos de tutores");
const aLog = (await adminC.from("ingest_log").select("outcome").limit(5)).data ?? [];
check(aLog.length > 0, "admin ve ingest_log");
const aDevices = (await adminC.from("devices").select("device_id")).data ?? [];
check(aDevices.length >= 5, `admin ve todos los dispositivos (${aDevices.length})`);
const aTok = await adminC.from("devices").select("token_hash").limit(1);
check(!!aTok.error, "ni el admin puede leer token_hash");
const aIns = await adminC.from("children").insert({ display_name: "x", classroom_id: aRooms[0]?.id });
check(!!aIns.error, "admin no puede insertar (solo lectura)");
const aUpd = await adminC.from("children").update({ display_name: "hack" }).eq("display_name", "Alumno A").select();
check(!!aUpd.error || (aUpd.data ?? []).length === 0, "admin no puede modificar (solo lectura)");
// Nadie puede ascenderse a admin
const me = (await p1.auth.getUser()).data.user!.id;
const selfPromote = await p1.from("admins").insert({ profile_id: me });
check(!!selfPromote.error, "un padre no puede ascenderse a admin");
const seeAdmins = (await p1.from("admins").select("profile_id")).data ?? [];
check(seeAdmins.length === 0, "un padre no ve la tabla de admins");
const teacherLog = (await teacher.from("ingest_log").select("*").limit(1)).data ?? [];
check(teacherLog.length === 0, "el docente sigue sin ver ingest_log");
const p1Profiles = (await p1.from("profiles").select("id")).data ?? [];
check(p1Profiles.length === 1, "un padre solo ve su propio perfil");

console.log(failures === 0 ? "\n✔ RLS correcta" : `\n✘ ${failures} verificación(es) fallaron`);
process.exit(failures === 0 ? 0 : 1);
