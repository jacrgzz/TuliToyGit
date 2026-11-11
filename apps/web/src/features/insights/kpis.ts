import { KPI, PATTERNS, THRESHOLDS } from "@/lib/thresholds";

// Indicadores de "Hoy" y resumen de la semana. Lógica pura: recibe las filas de
// classroom_daily_stats y el día de hoy (hora de México); no consulta nada ni usa la hora actual.
// Cada indicador compara con una referencia (lo habitual del propio salón o un rango recomendado)
// y nunca dice qué le pasa a un niño. Justificación: docs/analisis-docente.md, "Indicadores de Hoy".

export type DailyStat = {
  day: string; // YYYY-MM-DD (México)
  isodow: number; // 1 lunes ... 7 domingo
  readings: number;
  red_pct: number | null;
  temp_ok_pct: number | null;
  light_ok_pct: number | null;
  events: number;
};

export type KpiState = "ok" | "info" | "nodata";

export type Kpi = {
  id: "momentos" | "ruido" | "temperatura" | "luz" | "cobertura";
  title: string;
  value: string; // "5", "12 %"; "—" si no hay datos
  state: KpiState;
  sentence: string; // frase corta en lenguaje neutral
  reference: string; // lo habitual o lo recomendado, con su fuente resumida
};

const NO_DATA = "Aún sin datos suficientes hoy.";

export function addDays(day: string, n: number) {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function median(values: number[]) {
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

const pct = (v: number) => `${Math.round(v)} %`;

// Días escolares anteriores a hoy con lecturas suficientes (la base de "lo habitual").
function baselineRows(rows: DailyStat[], today: string) {
  const from = addDays(today, -KPI.baselineDays);
  return rows.filter((r) => r.day < today && r.day >= from && r.isodow < 6 && r.readings >= KPI.minReadings);
}

export function todayKpis(rows: DailyStat[], today: string): Kpi[] {
  const row = rows.find((r) => r.day === today);
  const enough = !!row && row.readings >= KPI.minReadings;
  const base = baselineRows(rows, today);

  // K1: momentos de hoy frente a lo habitual del salón (nivel y variabilidad de su propia línea base).
  let momentos: Kpi;
  if (!enough) {
    momentos = { id: "momentos", title: "Momentos hoy", value: "—", state: "nodata", sentence: NO_DATA, reference: "Se compara con los días anteriores de este salón." };
  } else if (base.length < KPI.minBaselineDays) {
    momentos = {
      id: "momentos",
      title: "Momentos hoy",
      value: String(row.events),
      state: "info",
      sentence: "Todavía no hay suficientes días para decir qué es lo habitual en este salón.",
      reference: `Se necesitan al menos ${KPI.minBaselineDays} días escolares con datos.`,
    };
  } else {
    const counts = base.map((r) => r.events);
    const lo = Math.min(...counts);
    const hi = Math.max(...counts);
    const med = median(counts);
    const sentence =
      row.events > hi ? "Más momentos que en los días anteriores." : row.events < lo ? "Menos momentos que en los días anteriores." : "Dentro de lo habitual.";
    momentos = {
      id: "momentos",
      title: "Momentos hoy",
      value: String(row.events),
      state: "info",
      sentence,
      reference: `Lo habitual en este salón: ${lo} a ${hi} por día (mediana ${med}).`,
    };
  }

  // K2: % de lecturas con pico de ruido alto, frente al promedio de los días anteriores.
  const redBase = base.filter((r) => r.red_pct !== null);
  const redAvg = redBase.length ? redBase.reduce((a, r) => a + (r.red_pct as number), 0) / redBase.length : null;
  const ruido: Kpi =
    !enough || row.red_pct === null
      ? { id: "ruido", title: "Tiempo con ruido alto", value: "—", state: "nodata", sentence: NO_DATA, reference: `Ruido alto: picos de ${PATTERNS.noiseHigh} dB o más.` }
      : {
          id: "ruido",
          title: "Tiempo con ruido alto",
          value: pct(row.red_pct),
          state: "info",
          sentence:
            redAvg === null
              ? "Es el porcentaje de lecturas de hoy con picos de ruido altos."
              : row.red_pct > redAvg + 5
                ? "Más tiempo con ruido alto que en los días anteriores."
                : row.red_pct < redAvg - 5
                  ? "Menos tiempo con ruido alto que en los días anteriores."
                  : "Parecido a los días anteriores.",
          reference: `Picos de ${PATTERNS.noiseHigh} dB o más${redAvg === null ? "" : `; promedio de los días anteriores: ${pct(redAvg)}`}.`,
        };

  // K3: % de lecturas con temperatura en rango cómodo.
  const temperatura: Kpi =
    !enough || row.temp_ok_pct === null
      ? { id: "temperatura", title: "Temperatura en rango cómodo", value: "—", state: "nodata", sentence: NO_DATA, reference: tempRef() }
      : {
          id: "temperatura",
          title: "Temperatura en rango cómodo",
          value: pct(row.temp_ok_pct),
          state: "info",
          sentence: "Porcentaje de lecturas de hoy entre " + `${THRESHOLDS.temp.low} y ${THRESHOLDS.temp.attentionHigh} °C.`,
          reference: tempRef(),
        };

  // K4: % de lecturas con luz suficiente para leer y escribir.
  const luz: Kpi =
    !enough || row.light_ok_pct === null
      ? { id: "luz", title: "Luz suficiente", value: "—", state: "nodata", sentence: NO_DATA, reference: lightRef() }
      : {
          id: "luz",
          title: "Luz suficiente",
          value: pct(row.light_ok_pct),
          state: "info",
          sentence: `Porcentaje de lecturas de hoy con ${KPI.lightOk} lux o más donde está la caja.`,
          reference: lightRef(),
        };

  return [momentos, ruido, temperatura, luz];
}

function tempRef() {
  return `Referencia: más fresco es mejor para tareas escolares; por debajo de unos ${KPI.tempRecommendedMax} °C en climas templados (provisional para México).`;
}

function lightRef() {
  return `Referencia: ${KPI.lightOk} a 500 lux en las mesas (EN 12464-1). La caja mide donde está colocada.`;
}

// K5: cobertura de datos. `ageMs` = antigüedad de la última señal del juguete (null si nunca se vio).
export function coverageKpi(toyAgesMs: (number | null)[], boxAgeMs: number | null): Kpi {
  const total = toyAgesMs.length;
  const boxOk = boxAgeMs !== null && boxAgeMs <= KPI.coverageWindowMs;
  if (total === 0) {
    return { id: "cobertura", title: "Cobertura de datos", value: "—", state: "nodata", sentence: "Este salón no tiene juguetes vinculados todavía.", reference: coverageRef() };
  }
  const active = toyAgesMs.filter((a) => a !== null && a <= KPI.coverageWindowMs).length;
  const share = active / total;
  const sentence =
    share >= KPI.coverageOk && boxOk
      ? "Los juguetes y la caja están enviando datos."
      : !boxOk
        ? "La caja no ha enviado datos en las últimas 24 h; sin ella no hay contexto del ambiente."
        : "Faltan juguetes con señal: \"sin momentos\" puede significar que estaban apagados.";
  return {
    id: "cobertura",
    title: "Cobertura de datos",
    value: pct(share * 100),
    state: share >= KPI.coverageOk && boxOk ? "ok" : "info",
    sentence,
    reference: coverageRef(),
  };
}

function coverageRef() {
  return `Referencia: ${Math.round(KPI.coverageOk * 100)} % o más de los juguetes con señal en las últimas 24 h.`;
}

// ---------------------------------------------------------------------------
// Resumen de la semana: lunes a hoy frente al MISMO tramo de la semana anterior.
// ---------------------------------------------------------------------------

export type WeekSummary = {
  daysWithData: number;
  events: number;
  prevEvents: number | null; // null si la semana anterior no tiene datos en ese tramo
  redPct: number | null;
  prevRedPct: number | null;
};

function weightedRed(rows: DailyStat[]) {
  const withRed = rows.filter((r) => r.red_pct !== null && r.readings > 0);
  const total = withRed.reduce((a, r) => a + r.readings, 0);
  if (total === 0) return null;
  return withRed.reduce((a, r) => a + (r.red_pct as number) * r.readings, 0) / total;
}

export function weekSummary(rows: DailyStat[], today: string): WeekSummary {
  const dow = new Date(`${today}T00:00:00Z`).getUTCDay() || 7; // 1 lunes ... 7 domingo
  const monday = addDays(today, -(dow - 1));
  const cur = rows.filter((r) => r.day >= monday && r.day <= today);
  const prev = rows.filter((r) => r.day >= addDays(monday, -7) && r.day <= addDays(today, -7));
  const sum = (rs: DailyStat[]) => rs.reduce((a, r) => a + r.events, 0);
  return {
    daysWithData: cur.filter((r) => r.readings > 0).length,
    events: sum(cur),
    prevEvents: prev.some((r) => r.readings > 0) ? sum(prev) : null,
    redPct: weightedRed(cur),
    prevRedPct: weightedRed(prev),
  };
}

// Frases del resumen: números y comparación, sin valorar ("mejor" o "peor") ni explicar causas.
export function weekSentences(w: WeekSummary): string[] {
  if (w.daysWithData === 0) return ["Esta semana todavía no hay lecturas del salón."];
  const out: string[] = [];
  out.push(
    w.prevEvents === null
      ? `Esta semana: ${w.events} ${w.events === 1 ? "momento" : "momentos"}.`
      : `Esta semana: ${w.events} ${w.events === 1 ? "momento" : "momentos"} (la semana pasada a esta altura: ${w.prevEvents}).`,
  );
  if (w.redPct !== null) {
    out.push(
      w.prevRedPct === null
        ? `Ruido alto el ${pct(w.redPct)} del tiempo.`
        : `Ruido alto el ${pct(w.redPct)} del tiempo (la semana pasada a esta altura: ${pct(w.prevRedPct)}).`,
    );
  }
  return out;
}
