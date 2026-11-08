// Provisión de datos de DEMO (solo datos simulados). Idempotente: se puede correr varias veces.
// Crea: salón demo, 2 niños con alias, 3 usuarios de prueba (2 padres + 1 docente),
// 2 juguetes y 1 caja con tokens NUEVOS cada vez.
// Los tokens y la contraseña demo se escriben en apps/web/.env.local (no se imprimen).
//
// Requiere SUPABASE_SERVICE_ROLE_KEY en apps/web/.env.local. Corre: npm run provision

import { createHash, randomBytes } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error(
    "Falta NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en apps/web/.env.local.\n" +
      "Pega tu service_role en esa línea (Project Settings → API Keys) y vuelve a correr.",
  );
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const ENV_PATH = new URL("../../apps/web/.env.local", import.meta.url);

function upsertEnv(values: Record<string, string>) {
  let text = readFileSync(ENV_PATH, "utf8");
  for (const [key, value] of Object.entries(values)) {
    const line = `${key}=${value}`;
    const re = new RegExp(`^${key}=.*$`, "m");
    text = re.test(text) ? text.replace(re, line) : text.replace(/\n?$/, `\n${line}\n`);
  }
  writeFileSync(ENV_PATH, text);
}

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
const newToken = () => randomBytes(24).toString("base64url");

function must<T>(res: { data: T; error: { message: string } | null }, what: string): NonNullable<T> {
  if (res.error || res.data === null) {
    console.error(`✘ ${what}: ${res.error?.message ?? "sin datos"}`);
    process.exit(1);
  }
  return res.data as NonNullable<T>;
}

// 1. Salón
const { data: room } = await admin.from("classrooms").select("id").eq("name", "Salón demo").maybeSingle();
const classroom =
  room ?? must(await admin.from("classrooms").insert({ name: "Salón demo" }).select("id").single(), "crear salón");
const classroomId = classroom.id as string;

// 2. Niños (alias; nunca datos reales)
async function ensureChild(display_name: string) {
  const { data } = await admin.from("children").select("id").eq("display_name", display_name).eq("classroom_id", classroomId).maybeSingle();
  if (data) return data.id as string;
  return must(await admin.from("children").insert({ display_name, classroom_id: classroomId }).select("id").single(), `crear niño ${display_name}`).id as string;
}
const childA = await ensureChild("Alumno A");
const childB = await ensureChild("Alumno B");

// 3. Usuarios demo
const existingPassword = readFileSync(ENV_PATH, "utf8").match(/^DEMO_PASSWORD=(.+)$/m)?.[1];
const demoPassword = existingPassword ?? randomBytes(12).toString("base64url");

async function ensureUser(email: string, role: "guardian" | "teacher", full_name: string) {
  const list = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  const found = list.data?.users.find((u) => u.email === email);
  if (found) {
    await admin.auth.admin.updateUserById(found.id, { password: demoPassword });
    return found.id;
  }
  const created = await admin.auth.admin.createUser({
    email,
    password: demoPassword,
    email_confirm: true,
    user_metadata: { role, full_name },
  });
  if (created.error || !created.data.user) {
    console.error(`✘ crear usuario ${email}: ${created.error?.message}`);
    process.exit(1);
  }
  return created.data.user.id;
}
const padre1 = await ensureUser("padre1@tuli.test", "guardian", "Padre Demo 1");
const padre2 = await ensureUser("padre2@tuli.test", "guardian", "Padre Demo 2");
const docente = await ensureUser("docente@tuli.test", "teacher", "Docente Demo");
const adminUser = await ensureUser("admin@tuli.test", "guardian", "Admin Demo");

must(await admin.from("guardians").upsert([
  { profile_id: padre1, child_id: childA },
  { profile_id: padre2, child_id: childB },
]).select(), "vincular tutores");
must(await admin.from("admins").upsert({ profile_id: adminUser }).select(), "crear admin demo");
must(await admin.from("teacher_classrooms").upsert({ profile_id: docente, classroom_id: classroomId }).select(), "vincular docente");

// 4. Dispositivos con tokens nuevos (se guarda solo el hash)
const tokens = { toy1: newToken(), toy2: newToken(), box: newToken() };
must(await admin.from("devices").upsert([
  { device_id: "tuli-toy-01", kind: "toy", child_id: childA, token_hash: sha256(tokens.toy1) },
  { device_id: "tuli-toy-02", kind: "toy", child_id: childB, token_hash: sha256(tokens.toy2) },
  { device_id: "tuli-box-01", kind: "box", classroom_id: classroomId, token_hash: sha256(tokens.box) },
  // Dispositivos de /demo (teléfono): se usan por server actions, el token nunca se necesita ni se guarda.
  { device_id: "tuli-toy-demo", kind: "toy", child_id: childA, token_hash: sha256(newToken()) },
  { device_id: "tuli-box-demo", kind: "box", classroom_id: classroomId, token_hash: sha256(newToken()) },
], { onConflict: "device_id" }).select(), "crear dispositivos");

upsertEnv({
  TOY_DEVICE_TOKEN: tokens.toy1,
  TOY2_DEVICE_TOKEN: tokens.toy2,
  BOX_DEVICE_TOKEN: tokens.box,
  DEMO_PASSWORD: demoPassword,
});

console.log("✔ Provisión lista (solo datos simulados).");
console.log("  Salón: Salón demo · Niños: Alumno A, Alumno B");
console.log("  Usuarios: padre1@tuli.test (Alumno A), padre2@tuli.test (Alumno B), docente@tuli.test (salón), admin@tuli.test (admin de solo lectura)");
console.log("  Dispositivos: tuli-toy-01, tuli-toy-02, tuli-box-01 y los de /demo (tuli-toy-demo, tuli-box-demo)");
console.log("  Tokens y DEMO_PASSWORD escritos en apps/web/.env.local (revísalo tú; no se imprimen).");
