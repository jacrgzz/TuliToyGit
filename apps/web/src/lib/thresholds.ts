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
  noiseHigh: THRESHOLDS.noise.high, // pico de ruido (dB) — ver justificación en docs/analisis-docente.md
  noiseSustained: THRESHOLDS.noise.attention, // ruido sostenido: promedio en la ventana (dB)
  lightSwing: 500, // cambio brusco de luz: máx. − mín. dentro de la ventana (lux)
  lightHigh: THRESHOLDS.light.attention, // luz muy intensa (lux)
  tempHigh: THRESHOLDS.temp.attentionHigh, // calor (°C, promedio)
  humHigh: THRESHOLDS.humidity.attentionHigh, // humedad alta (%, promedio)
  windowMinutes: 5, // ventana previa al evento (fija en las vistas event_context y event_summary)
  minEvents: 5, // menos momentos con lecturas = evidencia insuficiente
  strongEvents: 10, // momentos necesarios para evidencia alta
  minLift: 1.5, // razón mínima para considerar una coincidencia notable
  minBaselineWindows: 30, // ventanas mínimas en la línea base del salón
  curve: { beforeMin: 10, afterMin: 5, bucketS: 30 },
  episodeGapMin: 10, // pulsaciones a menos de estos minutos forman un episodio
  days: 30, // periodo por defecto
} as const;

// C2: aviso en vivo. Se avisa si en los últimos `windowMin` minutos casi todas las lecturas del salón
// (`minShare`) tuvieron pico alto, hay lecturas suficientes y la última es reciente.
export const ALERT = {
  windowMin: 2,
  minReadings: 3,
  minShare: 0.8,
  maxAgeMs: 2 * 60 * 1000,
} as const;

// Indicadores de "Hoy" (docs/analisis-docente.md, "Indicadores de Hoy"). VALORES PROVISIONALES.
export const KPI = {
  lightOk: 300, // lux mínimos para leer y escribir (EN 12464-1: 300 en primaria, 500 en tareas exigentes)
  tempRecommendedMax: 22, // °C: referencia que se muestra (Wargocki et al., 2019); el rango "cómodo" usa THRESHOLDS.temp
  coverageOk: 0.8, // proporción de juguetes con señal que se considera suficiente (referencia habitual en EMA)
  coverageWindowMs: 24 * 60 * 60 * 1000, // un juguete "tiene señal" si se vio en las últimas 24 h
  minReadings: 30, // menos lecturas en el día = "aún sin datos suficientes"
  baselineDays: 28, // días hacia atrás para "lo habitual"
  minBaselineDays: 3, // días escolares mínimos para decir qué es lo habitual
} as const;

// C7: batería del juguete.
export const BATTERY = { low: 20 } as const;

// Vista de la familia (tutor). Provisionales, como el resto. "Salón tranquilo": ruido alto en el 10 %
// del tiempo o menos; "buena parte del día": más del 30 %. Ver docs/vista-tutor.md.
export const FAMILY = { quietRedPct: 10, busyRedPct: 30 } as const;

// Parámetros de las funciones SQL de análisis (child_condition_lift, classroom_profiles).
export const LIFT_PARAMS = {
  p_noise: PATTERNS.noiseHigh,
  p_noise_avg: PATTERNS.noiseSustained,
  p_light_swing: PATTERNS.lightSwing,
  p_light_high: PATTERNS.lightHigh,
  p_temp_high: PATTERNS.tempHigh,
  p_hum_high: PATTERNS.humHigh,
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
  calm: "border-transparent bg-calm/10 text-calm",
  attention: "border-transparent bg-attention/10 text-attention",
  high: "border-transparent bg-high/10 text-high",
};
