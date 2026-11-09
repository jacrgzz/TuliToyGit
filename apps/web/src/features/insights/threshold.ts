import { PATTERNS } from "@/lib/thresholds";

// A4: umbral personal. Lógica pura sobre la distribución del pico de ruido (child_noise_distribution).
// Pregunta: ¿a partir de qué nivel sus momentos se vuelven más frecuentes que en el resto del tiempo?
// Solo una coincidencia descriptiva; nunca una causa ni un límite clínico.

export type NoiseBin = {
  bin_start: number;
  events_n: number;
  baseline_n: number;
  events_pct: number;
  baseline_pct: number;
};

export type PersonalThreshold = {
  db: number;
  lift: number; // Infinity si ese nivel nunca se vio en el resto del tiempo
  eventsPct: number;
  baselinePct: number;
  eventsAbove: number;
};

export function totalEvents(bins: NoiseBin[]) {
  return bins.reduce((a, b) => a + Number(b.events_n), 0);
}

// Umbral más bajo (múltiplo de la anchura de intervalo) desde el cual:
//  - al menos `minEvents` momentos tienen un pico igual o mayor, y
//  - la fracción de sus momentos por encima es `minLift` veces la del resto del tiempo.
export function personalThreshold(bins: NoiseBin[]): PersonalThreshold | null {
  const sorted = [...bins].sort((a, b) => a.bin_start - b.bin_start);
  const totalEv = totalEvents(sorted);
  const totalBase = sorted.reduce((a, b) => a + Number(b.baseline_n), 0);
  if (totalEv < PATTERNS.minEvents || totalBase < PATTERNS.minBaselineWindows) return null;

  for (const candidate of sorted) {
    const above = sorted.filter((b) => b.bin_start >= candidate.bin_start);
    const evAbove = above.reduce((a, b) => a + Number(b.events_n), 0);
    const baseAbove = above.reduce((a, b) => a + Number(b.baseline_n), 0);
    if (evAbove < PATTERNS.minEvents) continue;
    const evShare = evAbove / totalEv;
    const baseShare = baseAbove / totalBase;
    const lift = baseShare > 0 ? evShare / baseShare : Infinity;
    if (lift >= PATTERNS.minLift) {
      return {
        db: candidate.bin_start,
        lift,
        eventsPct: Math.round(evShare * 100),
        baselinePct: Math.round(baseShare * 100),
        eventsAbove: evAbove,
      };
    }
  }
  return null;
}

export function thresholdSummary(bins: NoiseBin[]): string {
  const n = totalEvents(bins);
  if (n < PATTERNS.minEvents) {
    return `Todavía hay pocos momentos con lecturas (${n}) para ver desde qué nivel de ruido coinciden más; se necesitan al menos ${PATTERNS.minEvents}.`;
  }
  const t = personalThreshold(bins);
  if (!t) {
    return "No se ve un nivel de ruido a partir del cual sus momentos sean más frecuentes que en el resto del tiempo.";
  }
  const ratio = Number.isFinite(t.lift) ? `${Math.round(t.lift * 10) / 10}× más a menudo` : "mucho más a menudo";
  return `Desde picos de unos ${t.db} dB sus momentos aparecen ${ratio} que en el resto del tiempo: ${t.eventsPct} % de sus momentos tuvo un pico así, frente al ${t.baselinePct} % del tiempo del salón.`;
}
