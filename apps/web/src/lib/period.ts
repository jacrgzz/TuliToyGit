// Periodos que el docente puede elegir (?dias=7|30|90). Cualquier otro valor usa el de defecto.
export const PERIODS = [7, 30, 90] as const;
export type Period = (typeof PERIODS)[number];

export function parsePeriod(value: string | string[] | undefined, fallback: Period = 30): Period {
  const n = Number(Array.isArray(value) ? value[0] : value);
  return (PERIODS as readonly number[]).includes(n) ? (n as Period) : fallback;
}

// Día elegido para la línea del día (?dia=YYYY-MM-DD). Devuelve null si no es una fecha válida.
export function parseDay(value: string | string[] | undefined): string | null {
  const v = Array.isArray(value) ? value[0] : value;
  if (!v || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  const d = new Date(`${v}T00:00:00Z`);
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== v ? null : v;
}
