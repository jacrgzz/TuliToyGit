// Vincula una cuenta REAL (por ejemplo tu Google) a los datos de demo.
// La persona debe haber iniciado sesión al menos una vez en la app.
//
//   npm run link -- correo@gmail.com guardian   → tutor de "Alumno A"
//   npm run link -- correo@gmail.com teacher    → docente del "Salón demo"
//   npm run link -- correo@gmail.com guardian --child "Alumno B"
//
// Es una herramienta de administración local (usa service_role); la invitación
// desde la propia app queda para después.

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Falta NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en apps/web/.env.local");
  process.exit(1);
}

const [email, role] = process.argv.slice(2);
const childFlag = process.argv.indexOf("--child");
const childName = childFlag >= 0 ? process.argv[childFlag + 1] : "Alumno A";

if (!email || !email.includes("@") || (role !== "guardian" && role !== "teacher")) {
  console.error("Uso: npm run link -- correo@gmail.com guardian|teacher [--child \"Alumno B\"]");
  process.exit(1);
}

const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

const { data: list, error: listError } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
if (listError) {
  console.error(`✘ no se pudo listar usuarios: ${listError.message}`);
  process.exit(1);
}
const user = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
if (!user) {
  console.error(`✘ No existe ${email}. Inicia sesión una vez en la app (con Google) y vuelve a correr esto.`);
  process.exit(1);
}

if (role === "guardian") {
  const { data: child } = await admin.from("children").select("id").eq("display_name", childName).maybeSingle();
  if (!child) {
    console.error(`✘ No existe el niño "${childName}". Corre npm run provision.`);
    process.exit(1);
  }
  const { error } = await admin.from("guardians").upsert({ profile_id: user.id, child_id: child.id });
  if (error) { console.error(`✘ ${error.message}`); process.exit(1); }
  console.log(`✔ ${email} ahora es tutor de "${childName}".`);
} else {
  const { data: room } = await admin.from("classrooms").select("id").eq("name", "Salón demo").maybeSingle();
  if (!room) {
    console.error('✘ No existe el "Salón demo". Corre npm run provision.');
    process.exit(1);
  }
  const { error } = await admin.from("teacher_classrooms").upsert({ profile_id: user.id, classroom_id: room.id });
  if (error) { console.error(`✘ ${error.message}`); process.exit(1); }
  console.log(`✔ ${email} ahora es docente del "Salón demo".`);
}
