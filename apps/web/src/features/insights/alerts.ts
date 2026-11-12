import { ALERT, PATTERNS } from "@/lib/thresholds";
import { evidenceFor } from "./evidence";

// C2: aviso en vivo por ruido alto sostenido. Lógica pura; la hora y la consulta viven en el servidor.
// Es una sugerencia sobre el ambiente, en lenguaje neutral: nunca dice qué le pasa a un niño.

export type LiveNoise = {
  readings_n: number;
  high_n: number;
  age_ms: number | null; // antigüedad de la última lectura; null si no hay
  avg_peak: number | null;
};

export type ProfileForAlert = {
  display_name: string;
  top_condition: string | null;
  top_lift: number | null;
  top_events_total: number | null;
  top_events_with: number | null;
  top_event_pct: number | null;
  top_baseline_pct: number | null;
  top_wilson_low: number | null;
};

const NOISE_CONDITIONS = ["ruido_pico", "ruido_sostenido"];

// Perfil con una coincidencia notable: evidencia media o alta (nunca "insuficiente").
function hasNotableEvidence(p: ProfileForAlert): boolean {
  if (!p.top_condition) return false;
  const ev = evidenceFor({
    condition: p.top_condition,
    events_total: Number(p.top_events_total ?? 0),
    events_with: Number(p.top_events_with ?? 0),
    event_pct: p.top_event_pct,
    baseline_pct: p.top_baseline_pct,
    lift: p.top_lift,
    wilson_low: p.top_wilson_low,
  });
  return ev === "alta" || ev === "media";
}

// Niños con una coincidencia notable de cualquier condición (resumen de la semana).
export function notableNames(profiles: ProfileForAlert[]): string[] {
  return profiles.filter(hasNotableEvidence).map((p) => p.display_name);
}

// Niños cuyos momentos coinciden con ruido alto con evidencia media o alta.
export function noiseSensitiveNames(profiles: ProfileForAlert[]): string[] {
  return profiles
    .filter((p) => p.top_condition !== null && NOISE_CONDITIONS.includes(p.top_condition) && hasNotableEvidence(p))
    .map((p) => p.display_name);
}

export function isNoiseAlert(live: LiveNoise): boolean {
  if (live.age_ms === null || live.age_ms > ALERT.maxAgeMs) return false; // lecturas viejas: no hay "ahora"
  if (live.readings_n < ALERT.minReadings) return false;
  return live.high_n / live.readings_n >= ALERT.minShare;
}

export function liveNoiseMessage(live: LiveNoise, sensitive: string[]): string | null {
  if (!isNoiseAlert(live)) return null;
  const base = `El ruido del salón lleva unos ${ALERT.windowMin} minutos en un nivel alto (picos de ${PATTERNS.noiseHigh} dB o más).`;
  if (sensitive.length === 0) return base;
  const names = sensitive.length === 1 ? sensitive[0] : `${sensitive.slice(0, -1).join(", ")} y ${sensitive[sensitive.length - 1]}`;
  return `${base} Los momentos de ${names} coinciden más a menudo con ruido alto. Quizá ayude bajarlo u ofrecer un espacio más tranquilo.`;
}
