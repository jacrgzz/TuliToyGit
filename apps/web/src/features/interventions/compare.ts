// Lógica pura de C5: comparar antes y después de un ajuste. Es un diseño AB descriptivo (como
// los diseños de caso único del WWC): se reporta la diferencia, nunca que el ajuste sea la causa.

export type CompareRow = {
  period: string; // "antes" | "despues"
  days_with_data: number;
  events: number;
  events_per_day: number | null;
};

export const MIN_DAYS_PER_SIDE = 5; // días hábiles con lecturas de la caja de cada lado
export const SIMILAR_RATIO = 0.2; // diferencia de hasta 20 % = "similar"

export const INTERVENTION_CAVEAT =
  "Es una observación de antes y después: no demuestra que el ajuste sea la causa del cambio (pudieron influir otras cosas).";

const fmt = (n: number) => (Math.round(n * 10) / 10).toString();

export function interventionSummary(rows: CompareRow[]): string {
  const before = rows.find((r) => r.period === "antes");
  const after = rows.find((r) => r.period === "despues");
  const nb = Number(before?.days_with_data ?? 0);
  const na = Number(after?.days_with_data ?? 0);

  if (nb < MIN_DAYS_PER_SIDE || na < MIN_DAYS_PER_SIDE) {
    return `Todavía no hay suficientes días con lecturas de la caja para comparar (antes: ${nb}, después: ${na}; se necesitan ${MIN_DAYS_PER_SIDE} de cada lado).`;
  }

  const rb = Number(before?.events_per_day ?? 0);
  const ra = Number(after?.events_per_day ?? 0);
  const base = Math.max(rb, 1);
  const ratio = (ra - rb) / base;
  const word = Math.abs(ratio) <= SIMILAR_RATIO ? "similar" : ratio > 0 ? "mayor" : "menor";
  return `Antes hubo ${fmt(rb)} momentos por día (${nb} días con datos); después, ${fmt(ra)} (${na} días con datos): una cantidad ${word}.`;
}
