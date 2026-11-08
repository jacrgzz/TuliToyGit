// Busca secretos en lo que git rastrea o va a rastrear. NUNCA imprime valores, solo archivos.
// Corre: node tools/verify/check-secrets.mjs   (código 1 si encuentra algo)
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { ROOT, readIfText, scanText, sensitiveValues } from "./secrets.mjs";

const git = (...args) => execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).split("\n").filter(Boolean);

const tracked = git("ls-files");
const untracked = git("ls-files", "--others", "--exclude-standard");
const files = [...new Set([...tracked, ...untracked])];

const problems = [];

// 1. Archivos de entorno con valores nunca deben estar en git.
for (const f of files) {
  if (/(^|\/)\.env(\.|$)/.test(f) && !f.endsWith(".env.example")) {
    problems.push({ file: f, what: "archivo de entorno rastreado o por rastrear" });
  }
}

// 2. Patrones de secretos y valores reales de .env.local dentro de los archivos.
const values = sensitiveValues();
for (const f of files) {
  if (/(^|\/)(package-lock\.json|node_modules\/)/.test(f)) continue;
  const text = readIfText(join(ROOT, f));
  if (text === null) continue;
  problems.push(...scanText(f, text, values));
}

if (problems.length === 0) {
  console.log(`✔ Sin secretos en ${files.length} archivos (rastreados o por rastrear)`);
  process.exit(0);
}
console.log("✘ Posibles secretos encontrados (no se muestran los valores):");
for (const p of problems) console.log(`  - ${p.file}: ${p.what}`);
process.exit(1);
