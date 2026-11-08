import type { TsSource } from "./schemas";

// Reglas de hora (docs/contrato-datos.md, "Sincronización de hora").
// Sin importar server-only: se prueba con vitest y la usa el simulador.

const MAX_FUTURE_MS = 2 * 60 * 1000; // más de 2 min en el futuro = reloj mal puesto
const MAX_PAST_MS = 7 * 24 * 60 * 60 * 1000; // más de 7 días atrás = sospechoso

export type ResolvedTime = { at: Date; source: TsSource };

export function resolveTimestamp(
  ts: string | undefined,
  source: TsSource | undefined,
  receivedAt: Date,
): ResolvedTime {
  // Sin hora del dispositivo: se usa la hora de llegada.
  if (!ts) return { at: receivedAt, source: "server" };

  // El dispositivo avisa que su reloj no está sincronizado: no se confía en `ts`.
  if (source === "unsynced") return { at: receivedAt, source: "unsynced" };

  const at = new Date(ts);
  const diff = at.getTime() - receivedAt.getTime();
  if (Number.isNaN(diff) || diff > MAX_FUTURE_MS || -diff > MAX_PAST_MS) {
    return { at: receivedAt, source: "unsynced" };
  }
  // Si no declaró fuente pero mandó hora válida, se asume NTP.
  return { at, source: source ?? "ntp" };
}
