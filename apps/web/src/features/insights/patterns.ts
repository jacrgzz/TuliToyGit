import { PATTERNS } from "@/lib/thresholds";

// Lógica pura (sin servidor) de la Fase 2: horarios, tendencia, episodios y ruido del salón.
// Justificación: docs/analisis-docente.md. Solo conteos y coincidencias; nunca causas.

export const DOW_LABEL = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"] as const;

export type HeatCell = { dow: number; hour: number; value: number };

export const MIN_EVENTS_FOR_TIME_PATTERN = 10;
export const CONCENTRATION_SHARE = 0.45; // una ventana de 2 h con 45 % o más de los momentos "destaca"
export const TREND_BLOCK_DAYS = 5; // días hábiles con datos que se comparan contra los 5 anteriores
export const TREND_SIMILAR_RATIO = 0.2; // diferencia de hasta 20 % se considera "similar"

export function formatHourRange(startHour: number, hours = 1) {
  return `${startHour} a ${startHour + hours} h`;
}

// El mapa muestra el horario escolar ampliado: 6 a 18 h. Lo que cae fuera no se dibuja
// (se avisa con `hasHiddenHours`) para que un dato aislado de madrugada no estire el mapa.
export const MAP_FIRST_HOUR = 6;
export const MAP_LAST_HOUR = 18;

// Horas que se dibujan: desde la primera hasta la última con datos dentro de 6 a 18 h (mínimo 8 a 14 h).
export function hourRange(cells: HeatCell[]) {
  const hours = cells
    .filter((c) => c.value > 0 && c.hour >= MAP_FIRST_HOUR && c.hour <= MAP_LAST_HOUR)
    .map((c) => c.hour);
  const min = Math.min(8, ...(hours.length ? hours : [8]));
  const max = Math.max(14, ...(hours.length ? hours : [14]));
  return { min, max };
}

export function hasHiddenHours(cells: HeatCell[]) {
  return cells.some((c) => c.value > 0 && (c.hour < MAP_FIRST_HOUR || c.hour > MAP_LAST_HOUR));
}

// Días de la semana que se dibujan: lunes a viernes, y sábado o domingo solo si hay datos.
export function visibleDows(cells: HeatCell[]) {
  const dows = new Set([1, 2, 3, 4, 5]);
  for (const c of cells) if (c.value > 0 && c.hour >= MAP_FIRST_HOUR && c.hour <= MAP_LAST_HOUR) dows.add(c.dow);
  return [...dows].sort((a, b) => a - b);
}

// Momentos por hora sumando todos los días de la semana.
export function byHour(cells: HeatCell[]) {
  const map = new Map<number, number>();
  for (const c of cells) map.set(c.hour, (map.get(c.hour) ?? 0) + c.value);
  return map;
}

// Resumen de A5: ¿hay una ventana de 2 horas donde se concentren sus momentos?
export function timeOfDaySummary(cells: HeatCell[]): string {
  const hours = byHour(cells);
  const total = [...hours.values()].reduce((a, b) => a + b, 0);
  if (total < MIN_EVENTS_FOR_TIME_PATTERN) {
    return `Todavía hay pocos momentos (${total}) para ver en qué horas se concentran; se necesitan al menos ${MIN_EVENTS_FOR_TIME_PATTERN}.`;
  }

  let best = { start: 0, count: -1 };
  for (const h of hours.keys()) {
    const count = (hours.get(h) ?? 0) + (hours.get(h + 1) ?? 0);
    if (count > best.count) best = { start: h, count };
  }
  const share = best.count / total;
  const pct = Math.round(share * 100);
  if (share >= CONCENTRATION_SHARE) {
    return `El ${pct} % de sus momentos (${best.count} de ${total}) ocurre entre las ${formatHourRange(best.start, 2)}.`;
  }
  return `Sus momentos se reparten a lo largo del día, sin una franja de 2 horas que destaque (la mayor reúne el ${pct} %).`;
}

// Agrupa días consecutivos sin lecturas en rangos legibles: "12/10 al 30/10 (15 días hábiles)".
export function missingRanges(rows: { day: string; events: number | null }[]): string[] {
  const fmt = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
  const out: string[] = [];
  let start = -1;
  const flush = (end: number) => {
    if (start < 0) return;
    const n = end - start + 1;
    out.push(n === 1 ? fmt(rows[start].day) : `${fmt(rows[start].day)} al ${fmt(rows[end].day)} (${n} días hábiles)`);
    start = -1;
  };
  rows.forEach((r, i) => {
    if (r.events === null) {
      if (start < 0) start = i;
    } else flush(i - 1);
  });
  flush(rows.length - 1);
  return out;
}

export type DailyRow = { day: string; events: number | null; moving_avg: number | null };

// Resumen de A6: compara el promedio de los últimos 5 días con datos contra los 5 anteriores.
export function trendSummary(rows: DailyRow[]): string {
  const withData = rows.filter((r) => r.events !== null);
  const need = TREND_BLOCK_DAYS * 2;
  if (withData.length < need) {
    return `Todavía no hay suficientes días con lecturas de la caja para comparar (hay ${withData.length}; se necesitan ${need}).`;
  }
  const last = withData.slice(-TREND_BLOCK_DAYS);
  const prev = withData.slice(-need, -TREND_BLOCK_DAYS);
  const avg = (xs: DailyRow[]) => xs.reduce((a, r) => a + (r.events ?? 0), 0) / xs.length;
  const a = avg(last);
  const b = avg(prev);
  const fmt = (n: number) => (Math.round(n * 10) / 10).toString();
  const base = Math.max(b, 1);
  const ratio = (a - b) / base;
  const word = Math.abs(ratio) <= TREND_SIMILAR_RATIO ? "similar" : ratio > 0 ? "mayor" : "menor";
  return `En los últimos ${TREND_BLOCK_DAYS} días con datos hubo ${fmt(a)} momentos por día, frente a ${fmt(b)} en los ${TREND_BLOCK_DAYS} anteriores: una cantidad ${word}.`;
}

export type EpisodeRow = { started_at: string; ended_at: string; presses: number; duration_s: number };

export function formatDuration(seconds: number) {
  if (seconds < 60) return "menos de 1 min";
  const m = Math.round(seconds / 60);
  return `${m} min`;
}

// Resumen de A7.
export function episodesSummary(eps: EpisodeRow[]): string {
  const presses = eps.reduce((a, e) => a + Number(e.presses), 0);
  if (presses === 0) return "No hay momentos en este periodo.";
  const longest = eps.reduce((m, e) => (Number(e.duration_s) > Number(m.duration_s) ? e : m), eps[0]);
  const base = `${presses} ${presses === 1 ? "momento formó" : "momentos formaron"} ${eps.length} ${eps.length === 1 ? "episodio" : "episodios"} (se agrupan cuando pasan menos de ${PATTERNS.episodeGapMin} minutos entre uno y otro).`;
  if (Number(longest.presses) < 3) return base;
  return `${base} El más largo duró ${formatDuration(Number(longest.duration_s))} con ${longest.presses} pulsaciones.`;
}

// Resumen de B2: la hora más ruidosa del salón.
export function noisiestHourSummary(cells: { hour: number; readings: number; high_pct: number | null }[]): string {
  const byH = new Map<number, { n: number; high: number }>();
  for (const c of cells) {
    const a = byH.get(c.hour) ?? { n: 0, high: 0 };
    a.n += Number(c.readings);
    a.high += (Number(c.readings) * Number(c.high_pct ?? 0)) / 100;
    byH.set(c.hour, a);
  }
  let best: { hour: number; pct: number } | null = null;
  for (const [hour, a] of byH) {
    if (a.n < PATTERNS.minBaselineWindows) continue;
    const pct = (100 * a.high) / a.n;
    if (!best || pct > best.pct) best = { hour, pct };
  }
  if (!best || best.pct < 10) return "Ninguna hora del día concentra picos de ruido altos en este periodo.";
  return `La hora más ruidosa del salón es de ${formatHourRange(best.hour)}: el ${Math.round(best.pct)} % de las lecturas tuvo picos de ${PATTERNS.noiseHigh} dB o más.`;
}
