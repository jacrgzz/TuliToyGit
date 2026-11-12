import { PATTERNS } from "@/lib/thresholds";

// Lógica pura (sin servidor) para clasificar la evidencia y redactar el resumen del perfil.
// Justificación de cada regla: docs/analisis-docente.md. Solo coincidencias: nunca causas.

export type ConditionKey =
  | "ruido_pico"
  | "ruido_sostenido"
  | "luz_brusca"
  | "luz_alta"
  | "calor"
  | "humedad_alta";

export type LiftRow = {
  condition: string;
  events_total: number;
  events_with: number;
  event_pct: number | null;
  baseline_total?: number;
  baseline_pct: number | null;
  lift: number | null;
  wilson_low: number | null;
  wilson_high?: number | null;
};

export type Evidence = "alta" | "media" | "sin_coincidencia" | "insuficiente";

// Título corto (gráficas y tablas) y texto para frases.
export const CONDITION_TITLE: Record<ConditionKey, string> = {
  ruido_pico: `Picos de ruido (≥ ${PATTERNS.noiseHigh} dB)`,
  ruido_sostenido: `Ruido sostenido (≥ ${PATTERNS.noiseSustained} dB prom.)`,
  luz_brusca: `Cambio brusco de luz (≥ ${PATTERNS.lightSwing} lux)`,
  luz_alta: `Luz muy intensa (≥ ${PATTERNS.lightHigh} lux)`,
  calor: `Calor (≥ ${PATTERNS.tempHigh} °C)`,
  humedad_alta: `Humedad alta (≥ ${PATTERNS.humHigh} %)`,
};

const CONDITION_TEXT: Record<ConditionKey, string> = {
  ruido_pico: `picos de ruido de ${PATTERNS.noiseHigh} dB o más`,
  ruido_sostenido: `ruido sostenido (promedio de ${PATTERNS.noiseSustained} dB o más)`,
  luz_brusca: `cambios bruscos de luz (${PATTERNS.lightSwing} lux o más)`,
  luz_alta: `luz muy intensa (${PATTERNS.lightHigh} lux o más)`,
  calor: `calor (${PATTERNS.tempHigh} °C o más)`,
  humedad_alta: `humedad alta (${PATTERNS.humHigh} % o más)`,
};

export const EVIDENCE_LABEL: Record<Evidence, string> = {
  alta: "Evidencia alta",
  media: "Evidencia media",
  sin_coincidencia: "Sin coincidencia notable",
  insuficiente: "Datos insuficientes",
};

// Actividades de la bitácora (condición "act_<tipo>"): el momento ocurre DURANTE la actividad.
const ACTIVITY_TITLE: Record<string, string> = {
  act_examen: "Durante un examen",
  act_recreo: "Durante el recreo",
  act_musica: "Durante música",
  act_lectura: "Durante la lectura",
  act_cambio: "Durante un cambio de actividad o de salón",
  act_otra: "Durante otra actividad",
};

export function conditionTitle(key: string) {
  return CONDITION_TITLE[key as ConditionKey] ?? ACTIVITY_TITLE[key] ?? key;
}

export function conditionText(key: string) {
  return CONDITION_TEXT[key as ConditionKey] ?? ACTIVITY_TITLE[key]?.toLowerCase() ?? key;
}

// Razón efectiva: si la condición nunca apareció en la línea base pero sí antes de momentos,
// la razón es "infinita" (la condición solo se vio alrededor de sus momentos).
export function effectiveLift(row: LiftRow): number {
  if (row.lift !== null) return Number(row.lift);
  if (row.events_with > 0 && Number(row.baseline_pct ?? 0) === 0) return Infinity;
  return 0;
}

export function evidenceFor(row: LiftRow): Evidence {
  const baselineTotal = row.baseline_total ?? Infinity;
  if (row.events_total < PATTERNS.minEvents || baselineTotal < PATTERNS.minBaselineWindows) {
    return "insuficiente";
  }
  const lift = effectiveLift(row);
  if (lift < PATTERNS.minLift) return "sin_coincidencia";
  const lowerAboveBase = Number(row.wilson_low ?? 0) > Number(row.baseline_pct ?? 100);
  if (row.events_total >= PATTERNS.strongEvents && lowerAboveBase) return "alta";
  return "media";
}

export function formatLift(lift: number) {
  if (!Number.isFinite(lift)) return "solo antes de sus momentos";
  if (lift >= 10) return "más de 10×";
  return `${(Math.round(lift * 10) / 10).toString()}×`;
}

const pct = (n: number | null) => `${Math.round(Number(n ?? 0))} %`;

// Condiciones notables ordenadas: primero evidencia alta, luego por razón.
export function notableConditions(rows: LiftRow[]) {
  return rows
    .map((r) => ({ row: r, evidence: evidenceFor(r), lift: effectiveLift(r) }))
    .filter((x) => x.evidence === "alta" || x.evidence === "media")
    .sort((a, b) => (a.evidence === b.evidence ? b.lift - a.lift : a.evidence === "alta" ? -1 : 1));
}

// Resumen en lenguaje simple (A9). Máximo dos frases de coincidencia.
export function summarize(rows: LiftRow[]): string[] {
  const n = rows.reduce((m, r) => Math.max(m, r.events_total), 0);
  if (n < PATTERNS.minEvents) {
    return [
      `Todavía hay pocos momentos con lecturas de la caja (${n}) para mostrar coincidencias; se necesitan al menos ${PATTERNS.minEvents}.`,
    ];
  }

  const notable = notableConditions(rows);
  if (notable.length === 0) {
    return [
      `En este periodo (${n} momentos), ninguna condición del salón aparece antes de sus momentos más a menudo que en el resto del tiempo.`,
    ];
  }

  return notable.slice(0, 2).map(({ row, evidence, lift }) => {
    const text = conditionText(row.condition);
    if (!Number.isFinite(lift)) {
      return `Hubo ${text} antes de ${row.events_with} de sus ${row.events_total} momentos y nunca en el resto del tiempo medido (${EVIDENCE_LABEL[evidence].toLowerCase()}).`;
    }
    return `Sus momentos coinciden ${formatLift(lift)} más a menudo con ${text} que el resto del tiempo: ${pct(row.event_pct)} de sus momentos frente a ${pct(row.baseline_pct)} del tiempo (${EVIDENCE_LABEL[evidence].toLowerCase()}).`;
  });
}
