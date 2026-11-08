// Umbrales del semaforo en un solo lugar. VALORES PROVISIONALES:
// validarlos con especialistas (entrevistas OE1) antes de presentarlos como criterio.
export type Level = "calm" | "attention" | "high"; // verde, amarillo, rojo

export const THRESHOLDS = {
  noise: { attention: 60, high: 75 }, // dB aprox.
  light: { attention: 1000, high: 3000 }, // lux (exceso de luz)
  temp: { low: 18, attentionHigh: 26, high: 30 }, // grados C
  humidity: { low: 30, attentionHigh: 60, high: 75 }, // %
} as const;

export function noiseLevel(db: number): Level {
  if (db >= THRESHOLDS.noise.high) return "high";
  if (db >= THRESHOLDS.noise.attention) return "attention";
  return "calm";
}
