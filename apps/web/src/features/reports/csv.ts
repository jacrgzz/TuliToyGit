// C6: exportar los momentos de un niño a CSV. Lógica pura y probada. Solo alias y números:
// nunca notas del docente ni datos de identidad. La hora va en hora de México.

export type CsvEvent = {
  occurred_at: string | null;
  ts_source: string | null;
  readings_count: number | null;
  noise_avg: number | null;
  noise_peak_max: number | null;
  light_min: number | null;
  light_max: number | null;
  temp_avg: number | null;
  humidity_avg: number | null;
  accidental: boolean | null;
};

export const CSV_HEADER = [
  "fecha_hora_mexico",
  "fuente_hora",
  "lecturas_previas_5min",
  "ruido_promedio_db",
  "ruido_pico_db",
  "luz_min_lux",
  "luz_max_lux",
  "temperatura_c",
  "humedad_pct",
  "pulsacion_accidental",
] as const;

const TZ = "America/Mexico_City";

// "2026-11-04T16:30:00Z" → "2026-11-04 10:30:00" (hora de México)
export function mexicoDateTime(iso: string) {
  return new Date(iso).toLocaleString("sv-SE", { timeZone: TZ });
}

// Escapa comillas y comas; neutraliza fórmulas (=, +, -, @) que Excel ejecutaría al abrir el archivo.
export function csvCell(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return "";
  let s = typeof value === "boolean" ? (value ? "si" : "no") : String(value);
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function eventsToCsv(events: CsvEvent[]): string {
  const lines = [CSV_HEADER.join(",")];
  for (const e of events) {
    lines.push(
      [
        e.occurred_at ? mexicoDateTime(e.occurred_at) : "",
        e.ts_source,
        e.readings_count,
        e.noise_avg,
        e.noise_peak_max,
        e.light_min,
        e.light_max,
        e.temp_avg,
        e.humidity_avg,
        e.accidental,
      ]
        .map(csvCell)
        .join(","),
    );
  }
  // BOM para que Excel abra bien los acentos; CRLF como pide el estándar CSV.
  return "﻿" + lines.join("\r\n") + "\r\n";
}

// Nombre de archivo seguro a partir del alias: "Alumno Á" → "alumno-a"
export function reportFileName(alias: string, days: number) {
  const slug = alias
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `tuli-${slug || "nino"}-${days}d.csv`;
}
