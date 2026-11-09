import { describe, expect, it } from "vitest";
import { csvCell, CSV_HEADER, eventsToCsv, mexicoDateTime, reportFileName, type CsvEvent } from "./csv";

const ev = (over: Partial<CsvEvent> = {}): CsvEvent => ({
  occurred_at: "2026-11-04T16:30:00.000Z",
  ts_source: "ntp",
  readings_count: 12,
  noise_avg: 52.4,
  noise_peak_max: 88,
  light_min: 620,
  light_max: 1400,
  temp_avg: 23.5,
  humidity_avg: 49,
  accidental: false,
  ...over,
});

describe("eventsToCsv", () => {
  it("lleva BOM, encabezado y CRLF", () => {
    const csv = eventsToCsv([ev()]);
    expect(csv.startsWith("﻿" + CSV_HEADER.join(","))).toBe(true);
    expect(csv.endsWith("\r\n")).toBe(true);
    expect(csv.split("\r\n")).toHaveLength(3); // encabezado + fila + vacío final
  });

  it("escribe la hora en México y los números con punto", () => {
    const row = eventsToCsv([ev()]).split("\r\n")[1];
    expect(row).toBe("2026-11-04 10:30:00,ntp,12,52.4,88,620,1400,23.5,49,no");
  });

  it("deja vacío lo que no hay y marca las accidentales", () => {
    const row = eventsToCsv([ev({ readings_count: 0, noise_avg: null, noise_peak_max: null, accidental: true })]).split("\r\n")[1];
    expect(row).toBe("2026-11-04 10:30:00,ntp,0,,,620,1400,23.5,49,si");
  });

  it("sin eventos solo trae el encabezado", () => {
    expect(eventsToCsv([]).split("\r\n").filter(Boolean)).toHaveLength(1);
  });
});

describe("csvCell", () => {
  it("escapa comillas, comas y saltos de línea", () => {
    expect(csvCell('di "hola", amigo')).toBe('"di ""hola"", amigo"');
    expect(csvCell("a\nb")).toBe('"a\nb"');
  });

  it("neutraliza fórmulas que Excel ejecutaría", () => {
    expect(csvCell("=CMD()")).toBe("'=CMD()");
    expect(csvCell("+1")).toBe("'+1");
    expect(csvCell("@x")).toBe("'@x");
    expect(csvCell("-2+3")).toBe("'-2+3");
  });

  it("no altera números negativos reales", () => {
    expect(csvCell(-5)).toBe("-5");
  });
});

describe("hora y nombre de archivo", () => {
  it("convierte a hora de México cruzando la medianoche", () => {
    expect(mexicoDateTime("2026-11-05T02:00:00.000Z")).toBe("2026-11-04 20:00:00");
  });

  it("genera un nombre seguro desde el alias", () => {
    expect(reportFileName("Alumno Á", 30)).toBe("tuli-alumno-a-30d.csv");
    expect(reportFileName("../../etc/passwd", 7)).toBe("tuli-etc-passwd-7d.csv");
    expect(reportFileName("***", 90)).toBe("tuli-nino-90d.csv");
  });
});
