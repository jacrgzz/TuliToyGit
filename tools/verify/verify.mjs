#!/usr/bin/env node
// Puerta de calidad de Tuli: corre TODAS las pruebas automáticas que deben pasar antes de dar
// por terminada cualquier funcionalidad. Catálogo completo en docs/pruebas.md.
//
//   node tools/verify/verify.mjs            estático: secretos, typecheck, lint, pruebas, build, bundle
//   node tools/verify/verify.mjs --live     contra Supabase y un servidor corriendo: ingesta, RLS,
//                                           páginas, Realtime, demo, migraciones y lint de la BD
//   node tools/verify/verify.mjs --all      estático + live (levanta y detiene el servidor solo)
//
// Desde apps/web: npm run verify | npm run verify:live | npm run verify:all
// Primera vez: npm run provision y npm run simulate -- --backfill 60 --no-live (en tools/simulator).
import { spawn, spawnSync } from "node:child_process";
import { join } from "node:path";

const ROOT = new URL("../../", import.meta.url).pathname;
const WEB = join(ROOT, "apps/web");
const SIM = join(ROOT, "tools/simulator");
const APP_URL = process.env.APP_URL ?? "http://localhost:3000";

const args = new Set(process.argv.slice(2));
const wantLive = args.has("--live") || args.has("--all");
const wantStatic = args.has("--all") || !args.has("--live");

const results = [];
let abort = false;

function step(name, cwd, cmd, cmdArgs, { critical = false, validate } = {}) {
  if (abort) return;
  const start = Date.now();
  process.stdout.write(`▶ ${name} … `);
  const r = spawnSync(cmd, cmdArgs, { cwd, encoding: "utf8", env: process.env, maxBuffer: 50 * 1024 * 1024 });
  const out = `${r.stdout ?? ""}${r.stderr ?? ""}`;
  let ok = r.status === 0;
  if (ok && validate) ok = validate(out);
  const secs = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`${ok ? "✔" : "✘"} (${secs}s)`);
  if (!ok) {
    const lines = out.trim().split("\n");
    console.log(lines.slice(-25).map((l) => `    ${l}`).join("\n"));
    if (critical) abort = true;
  }
  results.push({ name, ok, secs });
}

async function reachable() {
  try {
    const res = await fetch(APP_URL, { redirect: "manual" });
    return res.status < 500;
  } catch {
    return false;
  }
}

// ---------------- Estático ----------------
if (wantStatic) {
  console.log("\n══ Pruebas estáticas ══");
  step("Secretos en el repo", ROOT, "node", ["tools/verify/check-secrets.mjs"]);
  step("TypeScript (typecheck)", WEB, "npm", ["run", "typecheck"]);
  step("ESLint (lint)", WEB, "npm", ["run", "lint"]);
  step("Pruebas unitarias (contrato, hora)", WEB, "npm", ["test"]);
  step("Build de producción", WEB, "npm", ["run", "build"], { critical: true });
  step("Secretos en el bundle del navegador", ROOT, "node", ["tools/verify/check-bundle.mjs"]);
}

// ---------------- Live ----------------
if (wantLive) {
  console.log("\n══ Pruebas contra Supabase y la app ══");
  let server = null;
  if (!(await reachable())) {
    process.stdout.write(`▶ Levantando npm run dev en ${APP_URL} … `);
    server = spawn("npm", ["run", "dev"], { cwd: WEB, env: process.env, stdio: "ignore", detached: true });
    let up = false;
    for (let i = 0; i < 60 && !up; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      up = await reachable();
    }
    console.log(up ? "✔" : "✘ no arrancó en 120 s");
    if (!up) {
      results.push({ name: "Servidor de desarrollo", ok: false, secs: "120" });
      abort = true;
    }
  } else {
    console.log("▶ Usando el servidor que ya está corriendo");
  }

  const simStep = (name, script) => step(name, SIM, "npm", ["run", script]);
  simStep("API de ingesta (contrato v1)", "check-ingest");
  simStep("Políticas RLS (tutor, docente, admin)", "check-rls");
  simStep("Páginas por rol y aislamiento", "check-pages");
  simStep("Realtime respeta RLS", "check-realtime");
  simStep("Modo demo y server actions", "check-demo");
  step("Migraciones locales = remotas", ROOT, "npx", ["supabase", "migration", "list", "--remote"], {
    validate: (out) => {
      const line = out.split("\n").reverse().find((l) => l.startsWith('{"migrations"'));
      if (!line) return false;
      const { migrations } = JSON.parse(line);
      return migrations.length > 0 && migrations.every((m) => m.local && m.remote && m.local === m.remote);
    },
  });
  step("Lint del esquema de la base de datos", ROOT, "npx", ["supabase", "db", "lint", "--remote"], {
    validate: (out) => out.includes("No schema errors found"),
  });

  if (server?.pid) {
    try { process.kill(-server.pid); } catch { /* ya terminó */ }
  }
}

// ---------------- Resumen ----------------
const failed = results.filter((r) => !r.ok);
console.log("\n══ Resumen ══");
for (const r of results) console.log(`${r.ok ? "✔" : "✘"} ${r.name}`);
console.log(
  failed.length === 0
    ? `\n✔ TODO PASA (${results.length} verificaciones)`
    : `\n✘ ${failed.length} de ${results.length} verificaciones FALLARON: no des la funcionalidad por terminada.`,
);
console.log("Recuerda además lo manual de docs/pruebas.md (revisión visual, textos, móvil) según el tipo de cambio.");
process.exit(failed.length === 0 ? 0 : 1);
