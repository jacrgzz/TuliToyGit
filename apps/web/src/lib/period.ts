// Periodos que el docente puede elegir (?dias=7|30|90). Cualquier otro valor usa el de defecto.
export const PERIODS = [7, 30, 90] as const;
export type Period = (typeof PERIODS)[number];

export function parsePeriod(value: string | string[] | undefined, fallback: Period = 30): Period {
  const n = Number(Array.isArray(value) ? value[0] : value);
  return (PERIODS as readonly number[]).includes(n) ? (n as Period) : fallback;
}
