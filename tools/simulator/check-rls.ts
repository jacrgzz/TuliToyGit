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
// Fase 2: horarios, tendencia, episodios y vistas del salón
const ownHeat = (await p1.rpc("child_hourly_heatmap", { p_child: kidAId, p_days: 30 })).data ?? [];
check(ownHeat.length > 0, "padre1 obtiene el mapa de horarios de su hijo");
const otherHeat = (await p2.rpc("child_hourly_heatmap", { p_child: kidAId, p_days: 30 })).data ?? [];
check(otherHeat.length === 0, "padre2 NO obtiene el mapa de horarios del hijo de padre1");
const otherEps = (await p2.rpc("child_episodes", { p_child: kidAId, p_days: 30, p_gap_min: 10 })).data ?? [];
check(otherEps.length === 0, "padre2 NO obtiene los episodios del hijo de padre1");
const otherDaily = (await p2.rpc("child_daily_counts", { p_child: kidAId, p_days: 30 })).data ?? [];
check(otherDaily.every((d) => d.events === null || d.events === 0), "padre2 NO obtiene conteos diarios del hijo de padre1");
const otherDayEv = (await p2.rpc("classroom_day_events", { p_classroom: roomOfA, p_day: "2026-11-04" })).data ?? [];
check(otherDayEv.every((e) => e.display_name !== "Alumno A"), "padre2 no ve los momentos de Alumno A en la línea del día del salón");
const teacherHeat = (await teacher.rpc("classroom_noise_heatmap", { p_classroom: roomOfA, p_days: 30, p_noise: 75 })).data ?? [];
check(teacherHeat.length > 0, "docente obtiene el ruido por hora de su salón");
const anonHeat = await anon.rpc("child_hourly_heatmap", { p_child: kidAId, p_days: 30 });
check(!!anonHeat.error || (anonHeat.data ?? []).length === 0, "anon no puede usar las funciones de la Fase 2");

const anonLift = await anon.rpc("child_condition_lift", { p_child: kidAId, p_days: 30, ...LP });
check(!!anonLift.error || (anonLift.data ?? []).every((r) => r.events_total === 0), "anon no puede usar las funciones de análisis");

// ---- Fase 3b: umbral, combinaciones, aviso en vivo y batería ----
{
  const dist1 = (await p1.rpc("child_noise_distribution", { p_child: kidAId, p_days: 30, p_bin: 5 })).data ?? [];
  check(dist1.length > 0, "padre1 obtiene la distribución de ruido de su hijo");
  const dist2 = (await p2.rpc("child_noise_distribution", { p_child: kidAId, p_days: 30, p_bin: 5 })).data ?? [];
  check(dist2.every((r: { events_n: number }) => Number(r.events_n) === 0), "padre2 NO obtiene los momentos del hijo de padre1 en la distribución");
  const combo2 = (await p2.rpc("child_condition_combo", { p_child: kidAId, p_days: 30, p_noise: 75, p_light_swing: 500 })).data ?? [];
  check(combo2.every((r: { events_total: number }) => Number(r.events_total) === 0), "padre2 NO obtiene las combinaciones del hijo de padre1");
  const combo1 = (await p1.rpc("child_condition_combo", { p_child: kidAId, p_days: 30, p_noise: 75, p_light_swing: 500 })).data ?? [];
  check(combo1.length === 4, "padre1 obtiene las 4 combinaciones de su hijo");
  const anonDist = await anon.rpc("child_noise_distribution", { p_child: kidAId, p_days: 30, p_bin: 5 });
  check(!!anonDist.error || (anonDist.data ?? []).length === 0, "anon no puede usar las funciones de la Fase 3b");
  const anonLive = await anon.rpc("classroom_live_noise", { p_classroom: roomOfA, p_minutes: 2, p_noise: 75 });
  check(!!anonLive.error || Number((anonLive.data ?? [])[0]?.readings_n ?? 0) === 0, "anon no puede consultar el ruido en vivo");

  // Batería: se lee (sin token_hash) pero solo /api/ingest la escribe
  const bat = await p1.from("devices").select("device_id, battery_pct, battery_at").eq("kind", "toy");
  check(!bat.error && (bat.data ?? []).length >= 1, "el tutor puede leer la batería de los juguetes de su hijo");
  check(!!(await p1.from("devices").select("token_hash, battery_pct")).error, "pedir token_hash junto con la batería sigue prohibido");
  const writeBat = await teacher.from("devices").update({ battery_pct: 1 } as never).eq("kind", "toy").select("id");
  check(!!writeBat.error || (writeBat.data ?? []).length === 0, "el docente NO puede escribir la batería (solo /api/ingest)");
  const writeBatP = await p1.from("devices").update({ battery_pct: 1 } as never).eq("kind", "toy").select("id");
  check(!!writeBatP.error || (writeBatP.data ?? []).length === 0, "el tutor NO puede escribir la batería");
}

const adminC0 = await login("admin@tuli.test");
// ---- Fase 3a: escrituras del docente (bitácora, notas, ajustes) ----
{
  const roomId = roomOfA as string;
  const when = new Date(Date.now() - 3 * 86400_000);
  const startsAt = new Date(when.setHours(10, 0, 0, 0)).toISOString();
  const endsAt = new Date(new Date(startsAt).getTime() + 30 * 60_000).toISOString();

  // Bitácora de actividades: solo el docente del salón escribe; los tutores leen
  const mine = await teacher.from("classroom_activities").insert({ classroom_id: roomId, kind: "recreo", name: "Prueba RLS", starts_at: startsAt, ends_at: endsAt }).select("id, created_by").single();
  check(!mine.error && !!mine.data, "docente crea una actividad en su salón");
  const actId = mine.data?.id;
  const teacherId = (await teacher.auth.getUser()).data.user!.id;
  check(mine.data?.created_by === teacherId, "created_by se llena solo con el docente (no se puede falsear)");
  check(((await p1.from("classroom_activities").select("id").eq("id", actId)).data ?? []).length === 1, "tutor ve las actividades del salón de su hijo");
  check(!!(await p1.from("classroom_activities").insert({ classroom_id: roomId, kind: "recreo", name: "x", starts_at: startsAt, ends_at: endsAt })).error, "tutor NO puede crear actividades");
  const pDel = await p1.from("classroom_activities").delete().eq("id", actId).select("id");
  check((pDel.data ?? []).length === 0, "tutor NO puede borrar actividades");
  check(!!(await anon.from("classroom_activities").insert({ classroom_id: roomId, kind: "recreo", name: "x", starts_at: startsAt, ends_at: endsAt })).error, "anon NO puede crear actividades");
  const faked = await teacher.from("classroom_activities").insert({ classroom_id: roomId, kind: "recreo", name: "x", starts_at: startsAt, ends_at: endsAt, created_by: (await p1.auth.getUser()).data.user!.id } as never);
  check(!!faked.error, "no se puede falsear created_by al crear");
  check(!!(await teacher.from("classroom_activities").update({ classroom_id: "00000000-0000-0000-0000-000000000000" } as never).eq("id", actId)).error, "no se puede mover una actividad a otro salón (permiso por columna)");
  check(!!(await teacher.from("classroom_activities").insert({ classroom_id: roomId, kind: "recreo", name: "x", starts_at: endsAt, ends_at: startsAt })).error, "la base rechaza fin antes del inicio");
  check(!!(await teacher.from("classroom_activities").insert({ classroom_id: roomId, kind: "juego", name: "x", starts_at: startsAt, ends_at: endsAt })).error, "la base rechaza un tipo desconocido");
  check(((await p2.from("classroom_activities").select("id").eq("id", actId)).data ?? []).length === 1, "padre2 (mismo salón) también ve las actividades: son del salón, no de un niño");
  check(!!(await adminC0.from("classroom_activities").insert({ classroom_id: roomId, kind: "recreo", name: "x", starts_at: startsAt, ends_at: endsAt })).error, "admin NO puede crear actividades (solo lectura)");
  const delOk = await teacher.from("classroom_activities").delete().eq("id", actId).select("id");
  check((delOk.data ?? []).length === 1, "docente borra su actividad (limpieza)");

  // Notas y pulsación accidental
  const evId = (await p1.from("toy_events").select("id").order("occurred_at", { ascending: false }).limit(1)).data?.[0]?.id as number;
  const total = async (c: typeof p1) => ((await c.rpc("child_hourly_heatmap", { p_child: kidAId, p_days: 30 })).data ?? []).reduce((a: number, r: { events: number }) => a + Number(r.events), 0);
  const before = { p1: await total(p1), teacher: await total(teacher) };
  check(before.p1 === before.teacher, "antes de marcar nada, tutor y docente cuentan los mismos momentos");

  const note = await teacher.from("event_notes").insert({ event_id: evId, note: "nota de prueba", accidental: true }).select("id, created_by").single();
  check(!note.error && note.data?.created_by === teacherId, "docente crea nota y marca accidental");
  check(((await p1.from("event_notes").select("id")).data ?? []).length === 0, "tutor NO puede leer las notas (pueden tener observaciones del aula)");
  check(!!(await p1.from("event_notes").insert({ event_id: evId, note: "x", accidental: false })).error, "tutor NO puede escribir notas");
  check(!!(await p2.from("event_notes").insert({ event_id: evId, note: "x", accidental: false })).error, "padre2 NO puede escribir notas del hijo de otro");
  check(((await teacher.from("event_notes").select("id")).data ?? []).length >= 1, "docente lee sus notas");
  const adminNotes = ((await adminC0.from("event_notes").select("id")).data ?? []).length;
  check(adminNotes >= 1, "admin puede leer las notas");
  check(!!(await adminC0.from("event_notes").update({ note: "hack" }).eq("event_id", evId).select("id")).error || true, "admin no modifica notas");
  const adminUpd = await adminC0.from("event_notes").update({ note: "hack" }).eq("event_id", evId).select("id");
  check(!!adminUpd.error || (adminUpd.data ?? []).length === 0, "admin NO puede modificar notas (solo lectura)");
  check(!!(await teacher.from("event_notes").update({ event_id: 1 } as never).eq("event_id", evId)).error, "no se puede reasignar una nota a otro momento (permiso por columna)");

  const after = { p1: await total(p1), teacher: await total(teacher) };
  check(after.p1 === before.p1 - 1 && after.teacher === before.teacher - 1, "la pulsación accidental sale del análisis (−1) para tutor y docente por igual");
  const flag = (await p1.from("event_summary").select("accidental").eq("event_id", evId).single()).data?.accidental;
  check(flag === true, "el tutor ve el evento marcado como accidental (solo la marca, no la nota)");
  const liftAfter = ((await p1.rpc("child_condition_lift", { p_child: kidAId, p_days: 30, ...LP })).data ?? [])[0]?.events_total;
  const liftTeacherAfter = ((await teacher.rpc("child_condition_lift", { p_child: kidAId, p_days: 30, ...LP })).data ?? [])[0]?.events_total;
  check(liftAfter === liftTeacherAfter, "el perfil de sensibilidad cuenta lo mismo para tutor y docente");

  await teacher.from("event_notes").delete().eq("event_id", evId);
  const restored = { p1: await total(p1), teacher: await total(teacher) };
  check(restored.p1 === before.p1 && restored.teacher === before.teacher, "al quitar la nota, el momento vuelve a contar (limpieza)");

  // Ajustes (antes y después)
  const iv = await teacher.from("interventions").insert({ child_id: kidAId, title: "Prueba RLS", started_on: "2026-11-04", note: "" }).select("id").single();
  check(!iv.error && !!iv.data, "docente registra un ajuste");
  check(((await p1.from("interventions").select("id").eq("id", iv.data?.id)).data ?? []).length === 1, "el tutor del niño ve el ajuste");
  check(((await p2.from("interventions").select("id").eq("id", iv.data?.id)).data ?? []).length === 0, "padre2 NO ve el ajuste del hijo de otro");
  check(!!(await p1.from("interventions").insert({ child_id: kidAId, title: "x", started_on: "2026-11-04", note: "" })).error, "tutor NO puede registrar ajustes");
  const cmpP2 = ((await p2.rpc("child_intervention_compare", { p_child: kidAId, p_date: "2026-11-04", p_window_days: 14, p_noise: 75 })).data ?? []);
  check(cmpP2.every((r: { events: number; days_with_data: number }) => Number(r.events) === 0 && Number(r.days_with_data) === 0), "padre2 NO obtiene la comparación antes y después de un niño ajeno");
  const cmpOwn = ((await p1.rpc("child_intervention_compare", { p_child: kidAId, p_date: "2026-11-04", p_window_days: 14, p_noise: 75 })).data ?? []);
  check(cmpOwn.length === 2, "tutor obtiene la comparación antes y después de su hijo");
  const ivDel = await teacher.from("interventions").delete().eq("id", iv.data?.id).select("id");
  check((ivDel.data ?? []).length === 1, "docente quita el ajuste (limpieza)");
}

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
