// Umbrales del semáforo en un solo lugar. VALORES PROVISIONALES:
// validarlos con especialistas (entrevistas OE1) antes de presentarlos como criterio.
export type Level = "calm" | "attention" | "high"; // verde, amarillo, rojo

export const THRESHOLDS = {
  noise: { attention: 60, high: 75 }, // dB aprox.
  light: { attention: 1000, high: 3000 }, // lux (exceso de luz)
  temp: { low: 18, attentionHigh: 26, high: 30 }, // grados C
  humidity: { low: 30, attentionHigh: 60, high: 75 }, // %
} as const;

// Parámetros de los patrones (child_patterns en SQL). Se pasan a la función para
// que los umbrales vivan solo aquí.
export const PATTERNS = {
  noiseHigh: THRESHOLDS.noise.high, // dB que cuenta como pico alto
  lightSwing: 500, // variación de lux dentro de la ventana que cuenta como brusca
  windowMinutes: 5, // ventana previa al evento (fija en la vista event_context)
  minEventsForPattern: 3,
  days: 30,
} as const;

export function noiseLevel(db: number): Level {
  if (db >= THRESHOLDS.noise.high) return "high";
  if (db >= THRESHOLDS.noise.attention) return "attention";
  return "calm";
}

export function lightLevel(lux: number): Level {
  if (lux >= THRESHOLDS.light.high) return "high";
  if (lux >= THRESHOLDS.light.attention) return "attention";
  return "calm";
}

export function tempLevel(c: number): Level {
  if (c >= THRESHOLDS.temp.high) return "high";
  if (c >= THRESHOLDS.temp.attentionHigh || c < THRESHOLDS.temp.low) return "attention";
  return "calm";
}

export function humidityLevel(pct: number): Level {
  if (pct >= THRESHOLDS.humidity.high) return "high";
  if (pct >= THRESHOLDS.humidity.attentionHigh || pct < THRESHOLDS.humidity.low) return "attention";
  return "calm";
}

// El color nunca va solo: siempre acompaña una etiqueta de texto.
export const LEVEL_LABEL: Record<Level, string> = {
  calm: "Tranquilo",
  attention: "Atención",
  high: "Alto",
};

export const LEVEL_CLASS: Record<Level, string> = {
  calm: "border-calm bg-calm/10 text-calm",
  attention: "border-attention bg-attention/10 text-attention",
  high: "border-high bg-high/10 text-high",
};
