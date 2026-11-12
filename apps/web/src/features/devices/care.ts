import { BATTERY } from "@/lib/thresholds";

// "Su juguete" en la vista de la familia: quien lo carga es la familia. Lógica pura.
// El juguete solo envía al usarse (y con latidos si el firmware los manda), así que nunca se afirma
// que está apagado: se dice cuándo fue la última señal.
export type ToyCare = { title: string; value?: string; sentence: string; tone: "calm" | "info" | "nodata" };

export function toyCare(toy: { ageMs: number | null; batteryPct: number | null; lastSeen: string | null }, quietMs: number): ToyCare {
  const title = "Su juguete";
  const value = toy.batteryPct === null ? undefined : `${Math.round(toy.batteryPct)} %`;
  if (toy.ageMs === null || toy.lastSeen === null) {
    return { title, tone: "nodata", sentence: "Todavía no recibimos señal de su juguete. Revisa que esté encendido y con carga." };
  }
  if (toy.batteryPct !== null && toy.batteryPct < BATTERY.low) {
    return { title, value, tone: "info", sentence: `Cárgalo esta noche: le queda poca batería. Última señal ${toy.lastSeen}.` };
  }
  if (toy.ageMs > quietMs) {
    return {
      title,
      value,
      tone: "info",
      sentence: `La última señal fue ${toy.lastSeen}. El juguete solo envía cuando se usa, así que puede ser normal; si lo llevó a la escuela, revisa que esté encendido y con carga.`,
    };
  }
  return { title, value, tone: "calm", sentence: `Funcionando: última señal ${toy.lastSeen}.` };
}
