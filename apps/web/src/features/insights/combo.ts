import { evidenceFor, effectiveLift, formatLift, EVIDENCE_LABEL, type LiftRow } from "./evidence";
import { PATTERNS } from "@/lib/thresholds";

// A8: combinaciones de dos condiciones (pico de ruido y cambio brusco de luz).
export const COMBO_TITLE: Record<string, string> = {
  ambas: "Ruido alto y cambio brusco de luz a la vez",
  solo_ruido: "Solo ruido alto",
  solo_luz: "Solo cambio brusco de luz",
  ninguna: "Ninguna de las dos",
};

export function comboTitle(key: string) {
  return COMBO_TITLE[key] ?? key;
}

export function comboSummary(rows: LiftRow[]): string {
  const n = rows.reduce((m, r) => Math.max(m, r.events_total), 0);
  if (n < PATTERNS.minEvents) {
    return `Todavía hay pocos momentos con lecturas (${n}) para comparar combinaciones; se necesitan al menos ${PATTERNS.minEvents}.`;
  }
  const notable = rows
    .filter((r) => r.condition !== "ninguna")
    .map((r) => ({ r, evidence: evidenceFor(r), lift: effectiveLift(r) }))
    .filter((x) => x.evidence === "alta" || x.evidence === "media")
    .sort((a, b) => b.lift - a.lift);
  if (notable.length === 0) {
    return "Ninguna combinación de ruido y luz aparece antes de sus momentos más a menudo que en el resto del tiempo.";
  }
  const top = notable[0];
  const ratio = Number.isFinite(top.lift) ? `${formatLift(top.lift)} más a menudo` : "mucho más a menudo";
  return `La combinación que más coincide con sus momentos es «${comboTitle(top.r.condition).toLowerCase()}»: ${ratio} que en el resto del tiempo (${Math.round(Number(top.r.event_pct ?? 0))} % de sus momentos frente a ${Math.round(Number(top.r.baseline_pct ?? 0))} % del tiempo; ${EVIDENCE_LABEL[top.evidence].toLowerCase()}).`;
}
