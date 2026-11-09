import { describe, expect, it } from "vitest";
import {
  byHour,
  episodesSummary,
  formatDuration,
  hasHiddenHours,
  missingRanges,
  formatHourRange,
  hourRange,
  noisiestHourSummary,
  timeOfDaySummary,
  trendSummary,
  visibleDows,
  type DailyRow,
  type EpisodeRow,
  type HeatCell,
} from "./patterns";

// Palabras que nunca deben aparecer en las frases (skill marca-tuli): solo conteos y coincidencias.
const CLINICAL = /ansiedad|ansios|crisis|meltdown|diagn|trastorno|caus|detect|provoc|desencaden|mejor[ií]a|empeor|retroces|progres/i;

const cells = (pairs: [number, number, number][]): HeatCell[] => pairs.map(([dow, hour, value]) => ({ dow, hour, value }));

describe("hourRange y visibleDows", () => {
  it("usa al menos de 8 a 14 h y se amplía si hay datos fuera", () => {
    expect(hourRange([])).toEqual({ min: 8, max: 14 });
    expect(hourRange(cells([[1, 6, 2], [1, 16, 1]]))).toEqual({ min: 6, max: 16 });
  });

  it("ignora datos de madrugada o de noche: no estiran el mapa y se avisa", () => {
    const c = cells([[7, 3, 5], [1, 10, 4]]);
    expect(hourRange(c)).toEqual({ min: 8, max: 14 });
    expect(hasHiddenHours(c)).toBe(true);
    expect(visibleDows(c)).toEqual([1, 2, 3, 4, 5]);
    expect(hasHiddenHours(cells([[1, 10, 4]]))).toBe(false);
  });

  it("muestra lunes a viernes y fines de semana solo si hay datos", () => {
    expect(visibleDows([])).toEqual([1, 2, 3, 4, 5]);
    expect(visibleDows(cells([[7, 10, 3]]))).toEqual([1, 2, 3, 4, 5, 7]);
  });
});

describe("timeOfDaySummary", () => {
  it("con menos de 10 momentos no afirma nada", () => {
    const s = timeOfDaySummary(cells([[1, 11, 4], [2, 11, 3]]));
    expect(s).toContain("pocos momentos");
  });

  it("detecta una franja de 2 horas que concentra el 45 % o más", () => {
    // 11 y 12 h reúnen 20 de 26 momentos (77 %)
    const s = timeOfDaySummary(cells([[1, 8, 3], [1, 11, 9], [2, 12, 11], [3, 13, 3]]));
    expect(s).toContain("77 %");
    expect(s).toContain("11 a 13 h");
  });

  it("si se reparten, lo dice", () => {
    const s = timeOfDaySummary(cells([[1, 8, 3], [1, 9, 3], [1, 10, 3], [1, 11, 3], [1, 12, 3], [1, 13, 3]]));
    expect(s).toContain("se reparten");
  });

  it("suma todos los días de la semana por hora", () => {
    const m = byHour(cells([[1, 10, 2], [2, 10, 3], [3, 11, 1]]));
    expect(m.get(10)).toBe(5);
    expect(m.get(11)).toBe(1);
  });
});

describe("trendSummary", () => {
  const rows = (events: (number | null)[]): DailyRow[] =>
    events.map((e, i) => ({ day: `2026-11-${String(i + 1).padStart(2, "0")}`, events: e, moving_avg: null }));

  it("sin 10 días con datos no compara", () => {
    expect(trendSummary(rows([3, 4, 5, 6, 7]))).toContain("no hay suficientes días");
  });

  it("ignora los días sin datos de la caja (no los cuenta como cero)", () => {
    // 10 días con datos y 2 sin lecturas de la caja: si los "sin datos" contaran como 0
    // el promedio de los últimos 5 días bajaría y saldría "menor".
    const s = trendSummary(rows([2, 2, null, 2, 2, 2, null, 2, 2, 2, 2, 2]));
    expect(s).toContain("similar");
    expect(trendSummary(rows([2, 2, 2, 2, 2, 2, null, null, 2, 2, 2, 2]))).toContain("similar");
  });

  it("compara los últimos 5 días con los 5 anteriores", () => {
    expect(trendSummary(rows([2, 2, 2, 2, 2, 6, 6, 6, 6, 6]))).toContain("mayor");
    expect(trendSummary(rows([6, 6, 6, 6, 6, 2, 2, 2, 2, 2]))).toContain("menor");
  });
});

describe("missingRanges", () => {
  const r = (events: (number | null)[]) => events.map((e, i) => ({ day: `2026-10-${String(i + 1).padStart(2, "0")}`, events: e }));
  it("agrupa días consecutivos sin lecturas en rangos", () => {
    expect(missingRanges(r([null, null, null, 4, 5, null, 3]))).toEqual(["01/10 al 03/10 (3 días hábiles)", "06/10"]);
  });
  it("sin faltantes devuelve vacío", () => {
    expect(missingRanges(r([1, 2, 3]))).toEqual([]);
  });
});

describe("episodesSummary", () => {
  const ep = (presses: number, duration_s: number): EpisodeRow => ({
    started_at: "2026-11-02T16:00:00Z",
    ended_at: "2026-11-02T16:10:00Z",
    presses,
    duration_s,
  });

  it("sin momentos lo dice", () => {
    expect(episodesSummary([])).toBe("No hay momentos en este periodo.");
  });

  it("cuenta momentos y episodios y menciona el más largo si tiene 3 o más pulsaciones", () => {
    const s = episodesSummary([ep(1, 0), ep(5, 600), ep(2, 60)]);
    expect(s).toContain("8 momentos formaron 3 episodios");
    expect(s).toContain("10 min con 5 pulsaciones");
  });

  it("singular", () => {
    expect(episodesSummary([ep(1, 0)])).toContain("1 momento formó 1 episodio");
  });
});

describe("noisiestHourSummary", () => {
  it("encuentra la hora con más lecturas de pico alto", () => {
    const s = noisiestHourSummary([
      { hour: 9, readings: 200, high_pct: 5 },
      { hour: 10, readings: 200, high_pct: 51 },
      { hour: 11, readings: 200, high_pct: 4 },
    ]);
    expect(s).toContain("10 a 11 h");
    expect(s).toContain("51 %");
  });

  it("si ninguna hora destaca, lo dice", () => {
    expect(noisiestHourSummary([{ hour: 9, readings: 200, high_pct: 3 }])).toContain("Ninguna hora");
  });

  it("ignora horas con muy pocas lecturas", () => {
    expect(noisiestHourSummary([{ hour: 3, readings: 4, high_pct: 100 }])).toContain("Ninguna hora");
  });
});

describe("formato y lenguaje", () => {
  it("formatea horas y duraciones", () => {
    expect(formatHourRange(11, 2)).toBe("11 a 13 h");
    expect(formatDuration(20)).toBe("menos de 1 min");
    expect(formatDuration(600)).toBe("10 min");
  });

  it("ninguna frase usa lenguaje clínico, de causa ni de mejoría o empeoramiento", () => {
    const trendRows: DailyRow[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => ({ day: `2026-11-${n}`, events: n, moving_avg: null }));
    const sentences = [
      timeOfDaySummary(cells([[1, 11, 20]])),
      timeOfDaySummary(cells([[1, 8, 3], [1, 11, 9], [2, 12, 11]])),
      timeOfDaySummary([]),
      trendSummary(trendRows),
      trendSummary([]),
      episodesSummary([]),
      episodesSummary([{ started_at: "a", ended_at: "b", presses: 6, duration_s: 900 }]),
      noisiestHourSummary([{ hour: 10, readings: 300, high_pct: 50 }]),
      noisiestHourSummary([]),
    ];
    for (const s of sentences) expect(s).not.toMatch(CLINICAL);
  });
});
