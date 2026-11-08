// Utilidades compartidas para buscar secretos SIN imprimirlos nunca (solo nombres de archivo).
import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

export const ROOT = new URL("../../", import.meta.url).pathname;

const SENSITIVE_KEYS = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "TOY_DEVICE_TOKEN",
  "TOY2_DEVICE_TOKEN",
  "BOX_DEVICE_TOKEN",
  "DEMO_PASSWORD",
];

// Valores reales de apps/web/.env.local (solo en memoria; nunca se imprimen).
export function sensitiveValues() {
  const path = join(ROOT, "apps/web/.env.local");
  if (!existsSync(path)) return [];
  const out = [];
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && SENSITIVE_KEYS.includes(m[1])) {
      const v = m[2].trim().replace(/^["']|["']$/g, "");
      if (v.length >= 8) out.push({ key: m[1], value: v });
    }
  }
  return out;
}

// Patrones de secretos conocidos.
const PATTERNS = [
  { name: "clave secreta de Supabase (sb_secret_…)", re: /sb_secret_[A-Za-z0-9_-]{10,}/ },
  { name: "JWT (posible service_role o token)", re: /eyJhbGciOi[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}/ },
  { name: "URL de base de datos con contraseña", re: /postgres(?:ql)?:\/\/[^\s:@/]+:[^\s@/]{4,}@/ },
];

// Devuelve [{ file, what }] con lo que encontró en el texto dado (sin el valor).
export function scanText(file, text, values) {
  const hits = [];
  for (const p of PATTERNS) if (p.re.test(text)) hits.push({ file, what: p.name });
  for (const { key, value } of values) if (text.includes(value)) hits.push({ file, what: `valor de ${key}` });
  return hits;
}

export function readIfText(path, maxBytes = 3_000_000) {
  try {
    if (statSync(path).size > maxBytes) return null;
    const buf = readFileSync(path);
    if (buf.includes(0)) return null; // binario
    return buf.toString("utf8");
  } catch {
    return null;
  }
}
