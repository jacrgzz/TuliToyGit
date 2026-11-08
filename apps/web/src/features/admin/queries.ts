import { createClient } from "@/lib/supabase/server";

// Todo se consulta con el cliente del usuario: RLS le da acceso total SOLO si es admin.
// Si alguien que no es admin llegara aquí, recibiría listas vacías, no datos ajenos.

async function count(table: "classrooms" | "children" | "devices") {
  const supabase = await createClient();
  // Se cuenta una columna concreta (no *): en devices, token_hash no es legible ni para el admin.
  const { count: n, error } = await supabase.from(table).select("id", { count: "exact", head: true });
  if (error) throw new Error(`No se pudo contar ${table}: ${error.message}`);
  return n ?? 0;
}

export async function getAdminOverview() {
  const supabase = await createClient();
  const dayAgo = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const hourAgo = new Date(Date.now() - 3600 * 1000).toISOString();

  const [classrooms, children, devices, events24h, readings1h, errors24h] = await Promise.all([
    count("classrooms"),
    count("children"),
    count("devices"),
    supabase.from("toy_events").select("*", { count: "exact", head: true }).gte("occurred_at", dayAgo),
    supabase.from("sensor_readings").select("*", { count: "exact", head: true }).gte("measured_at", hourAgo),
    supabase.from("ingest_log").select("*", { count: "exact", head: true }).gte("received_at", dayAgo).gte("status", 400),
  ]);

  return {
    classrooms,
    children,
    devices,
    events24h: events24h.count ?? 0,
    readings1h: readings1h.count ?? 0,
    ingestErrors24h: errors24h.count ?? 0,
  };
}

export async function listAdminDevices() {
  const supabase = await createClient();
  const [devices, children, classrooms] = await Promise.all([
    supabase.from("devices").select("device_id, kind, child_id, classroom_id, last_seen_at").order("device_id"),
    supabase.from("children").select("id, display_name"),
    supabase.from("classrooms").select("id, name"),
  ]);
  for (const r of [devices, children, classrooms]) {
    if (r.error) throw new Error(`No se pudieron cargar los dispositivos: ${r.error.message}`);
  }
  const childName = new Map(children.data!.map((c) => [c.id, c.display_name]));
  const roomName = new Map(classrooms.data!.map((c) => [c.id, c.name]));
  return devices.data!.map((d) => ({
    ...d,
    linkedTo:
      d.kind === "toy"
        ? `Niño: ${d.child_id ? (childName.get(d.child_id) ?? "—") : "—"}`
        : `Salón: ${d.classroom_id ? (roomName.get(d.classroom_id) ?? "—") : "—"}`,
  }));
}

export async function listAdminClassrooms() {
  const supabase = await createClient();
  const [rooms, kids] = await Promise.all([
    supabase.from("classrooms").select("id, name").order("name"),
    supabase.from("children").select("id, display_name, classroom_id").order("display_name"),
  ]);
  if (rooms.error) throw new Error(`No se pudieron cargar los salones: ${rooms.error.message}`);
  if (kids.error) throw new Error(`No se pudieron cargar los niños: ${kids.error.message}`);
  return rooms.data.map((r) => ({
    ...r,
    children: kids.data.filter((k) => k.classroom_id === r.id),
  }));
}

export async function listAdminUsers() {
  const supabase = await createClient();
  const [profiles, guardians, teachers, children, classrooms] = await Promise.all([
    supabase.from("profiles").select("id, email, full_name, role, created_at").order("created_at"),
    supabase.from("guardians").select("profile_id, child_id"),
    supabase.from("teacher_classrooms").select("profile_id, classroom_id"),
    supabase.from("children").select("id, display_name"),
    supabase.from("classrooms").select("id, name"),
  ]);
  for (const r of [profiles, guardians, teachers, children, classrooms]) {
    if (r.error) throw new Error(`No se pudieron cargar los usuarios: ${r.error.message}`);
  }
  const childName = new Map(children.data!.map((c) => [c.id, c.display_name]));
  const roomName = new Map(classrooms.data!.map((c) => [c.id, c.name]));
  return profiles.data!.map((p) => ({
    ...p,
    links: [
      ...guardians.data!.filter((g) => g.profile_id === p.id).map((g) => `Tutor de ${childName.get(g.child_id) ?? "?"}`),
      ...teachers.data!.filter((t) => t.profile_id === p.id).map((t) => `Docente de ${roomName.get(t.classroom_id) ?? "?"}`),
    ],
  }));
}

export async function listIngestLog(limit = 40) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ingest_log")
    .select("id, received_at, device_id, type, status, outcome, detail")
    .order("received_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`No se pudo cargar el registro de ingesta: ${error.message}`);
  return data;
}
