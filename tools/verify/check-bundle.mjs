// Después de `npm run build`: comprueba que ningún secreto llegó al código que se envía al navegador.
// Corre: node tools/verify/check-bundle.mjs   (código 1 si encuentra algo)
import { existsSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { ROOT, readIfText, scanText, sensitiveValues } from "./secrets.mjs";

const staticDir = join(ROOT, "apps/web/.next/static");
if (!existsSync(staticDir)) {
  console.error("✘ No existe apps/web/.next/static. Corre primero npm run build.");
  process.exit(1);
}

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else yield p;
  }
}

const values = sensitiveValues();
const problems = [];
let count = 0;
for (const file of walk(staticDir)) {
  if (!/\.(js|css|html|json|txt|map)$/.test(file)) continue;
  const text = readIfText(file, 10_000_000);
  if (text === null) continue;
  count++;
  problems.push(...scanText(relative(ROOT, file), text, values));
  // El nombre de la variable no debe aparecer en código de cliente.
  if (text.includes("SUPABASE_SERVICE_ROLE_KEY")) {
    problems.push({ file: relative(ROOT, file), what: "nombre SUPABASE_SERVICE_ROLE_KEY en código de cliente" });
  }
}

if (problems.length === 0) {
  console.log(`✔ Ningún secreto en el código de cliente (${count} archivos del bundle revisados)`);
  process.exit(0);
}
console.log("✘ Secretos o referencias sensibles en el bundle del navegador (valores no mostrados):");
for (const p of problems) console.log(`  - ${p.file}: ${p.what}`);
process.exit(1);
