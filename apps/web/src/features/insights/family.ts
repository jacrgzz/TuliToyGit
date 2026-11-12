import { FAMILY, KPI, PATTERNS } from "@/lib/thresholds";
import { conditionText, EVIDENCE_LABEL, notableConditions, type LiftRow } from "./evidence";
import type { DailyStat } from "./kpis";
import { addDays, median } from "./kpis";

// Vista de la familia (tutor): frases sencillas y en positivo sobre un solo niño.
// Lógica pura: recibe filas ya consultadas y el día de hoy (hora de México); no usa la hora actual.
// Nunca compara con otros niños, nunca usa lenguaje clínico ni habla de causas.
// Justificación: docs/vista-tutor.md.

// Fila de child_daily_counts: un día escolar; `events` es null si la caja no envió lecturas ese día.
export type ChildDay = { day: string; readings: number; events: number | null };

export type FamilyTone = "calm" | "info" | "nodata";

export type FamilyCard = {
  title: string;
  value?: string;
  sentence: string;
  detail?: string;
  tone: FamilyTone;
};

export const TOY_IS_OK =
  "Usar el juguete no es algo malo: solo nos ayuda a ver en qué momentos lo buscó.";

const isoDow = (day: string) => new Date(`${day}T00:00:00Z`).getUTCDay() || 7; // 1 lunes ... 7 domingo
const times = (n: number) => `${n} ${n === 1 ? "vez" : "veces"}`;

// Días escolares anteriores con datos suficientes (la base de "lo habitual" del niño).
function childBaseline(rows: ChildDay[], before: string) {
  const from = addDays(before, -KPI.baselineDays);
  return rows.filter(
    (r): r is ChildDay & { events: number } =>
      r.day < before && r.day >= from && r.events !== null && r.readings >= KPI.minReadings && isoDow(r.day) < 6,
  );
}

// "Cómo le fue hoy": las veces de hoy frente a su propio rango habitual.
export function childToday(rows: ChildDay[], today: string, name: string): FamilyCard {
  const title = "Cómo le va hoy";
  if (isoDow(today) >= 6) {
    return { title, tone: "nodata", sentence: "Hoy no hay clases. En «Su semana» puedes ver cómo le fue estos días." };
  }
  const row = rows.find((r) => r.day === today);
  if (!row || row.readings === 0 || row.events === null) {
    return { title, tone: "nodata", sentence: "Todavía no hay datos del salón de hoy." };
  }
  const value = times(row.events);
  if (row.readings < KPI.minReadings) {
    return { title, value, tone: "info", sentence: "Hasta ahora. Aún hay pocos datos del día para compararlo con otros días." };
  }
  const base = childBaseline(rows, today);
  if (base.length < KPI.minBaselineDays) {
    return {
      title,
      value,
      tone: "info",
      sentence: `Todavía no hay suficientes días para saber qué es lo habitual en ${name}.`,
      detail: `Se necesitan al menos ${KPI.minBaselineDays} días de clases con datos.`,
    };
  }
  const counts = base.map((r) => r.events);
  const lo = Math.min(...counts);
  const hi = Math.max(...counts);
  const detail = `Lo habitual en ${name}: entre ${lo} y ${hi} veces por día. Cuenta las veces de hoy hasta ahora.`;
  if (row.events > hi) {
    return {
      title,
      value,
      tone: "info",
      sentence: "Lo usó más veces que en otros días. Puede ser un buen tema para platicar con su maestra o maestro.",
      detail,
    };
  }
  if (row.events < lo) {
    return { title, value, tone: "calm", sentence: "Hasta ahora, lo usó menos veces que en otros días.", detail };
  }
  return { title, value, tone: "calm", sentence: `Un día dentro de lo habitual para ${name}.`, detail };
}

// "El salón hoy": cuánto del tiempo medido hubo picos de ruido alto (classroom_daily_stats).
export function roomToday(stats: DailyStat[], today: string): FamilyCard {
  const title = "El salón hoy";
  const row = stats.find((r) => r.day === today);
  if (!row || row.readings < KPI.minReadings || row.red_pct === null) {
    return { title, tone: "nodata", sentence: "Aún no hay suficientes datos del salón de hoy." };
  }
  const red = Math.round(row.red_pct);
  const detail = `Hubo picos de ruido de ${PATTERNS.noiseHigh} dB o más en el ${red} % del tiempo medido.`;
  if (red <= FAMILY.quietRedPct) return { title, tone: "calm", sentence: "El salón estuvo tranquilo casi todo el día.", detail };
  if (red <= FAMILY.busyRedPct) return { title, tone: "info", sentence: "El salón tuvo algunos ratos de ruido alto.", detail };
  return { title, tone: "info", sentence: "El salón tuvo ruido alto buena parte del día.", detail };
}

// "Su semana": lunes a hoy frente al mismo tramo de la semana anterior, y cuántos días lo usó
// igual o menos que de costumbre (mediana de las semanas anteriores). Números, sin juicios.
export type WeekDay = { day: string; dow: number; events: number | null };

export function childWeek(rows: ChildDay[], today: string): { sentences: string[]; days: WeekDay[] } {
  const dow = isoDow(today);
  const monday = addDays(today, -(dow - 1));
  const lastDay = dow >= 6 ? addDays(monday, 4) : today;
  const days: WeekDay[] = [];
  for (let d = monday; d <= lastDay; d = addDays(d, 1)) {
    const r = rows.find((x) => x.day === d);
    days.push({ day: d, dow: isoDow(d), events: r && r.readings > 0 ? r.events : null });
  }
  const withData = days.filter((d): d is WeekDay & { events: number } => d.events !== null);
  if (withData.length === 0) return { sentences: ["Esta semana todavía no hay datos del salón."], days };

  const total = withData.reduce((a, d) => a + d.events, 0);
  const prev = rows.filter((r) => r.day >= addDays(monday, -7) && r.day <= addDays(lastDay, -7) && r.events !== null && r.readings > 0);
  const prevTotal = prev.length > 0 ? prev.reduce((a, r) => a + (r.events as number), 0) : null;
  const sentences = [
    prevTotal === null
      ? `Esta semana usó su juguete ${times(total)}.`
      : `Esta semana usó su juguete ${times(total)} (la semana pasada a esta altura: ${prevTotal}).`,
  ];

  const base = childBaseline(rows, monday);
  if (base.length >= KPI.minBaselineDays) {
    const med = median(base.map((r) => r.events));
    const calm = withData.filter((d) => d.events <= med).length;
    sentences.push(
      `${calm} de ${withData.length} ${withData.length === 1 ? "día" : "días"} lo usó igual o menos que de costumbre (${med} ${med === 1 ? "vez" : "veces"} por día).`,
    );
  }
  return { sentences, days };
}

// Preguntas para platicar con el docente. La primera depende de lo que más coincidió (si hay).
export function meetingQuestions(topCondition: string | null): string[] {
  const out: string[] = [];
  if (topCondition) out.push(`¿Qué suele pasar en el salón cuando hay ${topCondition}?`);
  out.push(
    "¿En qué momentos del día lo ves más a gusto?",
    "¿Qué le ayuda a calmarse en el salón?",
    "¿Hay algo que podamos hacer igual en casa y en la escuela?",
  );
  return out;
}

// "Lo que más coincidió", en una frase sencilla. Solo la condición más notable (evidencia media o
// alta); `top` alimenta la primera pregunta para el docente.
export function familyCoincidence(rows: LiftRow[]): { sentence: string; top: string | null } {
  const n = rows.reduce((m, r) => Math.max(m, r.events_total), 0);
  if (n < PATTERNS.minEvents) {
    return { sentence: `Todavía hay pocos momentos (${n}) para ver si algo del salón coincide con ellos; se necesitan al menos ${PATTERNS.minEvents}.`, top: null };
  }
  const [first] = notableConditions(rows);
  if (!first) return { sentence: "Por ahora no vemos que algo del ambiente del salón coincida con sus momentos más que el resto del tiempo.", top: null };
  const text = conditionText(first.row.condition);
  return {
    sentence: `Sus momentos coinciden más a menudo con ${text} que el resto del tiempo (${EVIDENCE_LABEL[first.evidence].toLowerCase()}). Es una coincidencia: no explica por qué lo buscó.`,
    top: text,
  };
}
