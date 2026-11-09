import { describe, expect, it } from "vitest";
import { KPI } from "@/lib/thresholds";
import { coverageKpi, todayKpis, weekSentences, weekSummary, type DailyStat } from "./kpis";

const CLINICAL = /ansiedad|ansios|crisis|meltdown|diagn|trastorno|caus|detect|provoc|desencaden|sufr|enferm|mejor[ií]a|empeor|retroces|progres/i;

// 2026-11-09 es lunes. Días escolares anteriores: 2026-11-02 a 2026-11-06 (lun a vie).
const TODAY = "2026-11-09";

function row(day: string, isodow: number, over: Partial<DailyStat> = {}): DailyStat {
  return { day, isodow, readings: 200, red_pct: 10, temp_ok_pct: 90, light_ok_pct: 80, events: 3, ...over };
}

const history: DailyStat[] = [
  row("2026-11-02", 1, { events: 2, red_pct: 8 }),
  row("2026-11-03", 2, { events: 4, red_pct: 12 }),
  row("2026-11-04", 3, { events: 6, red_pct: 10 }),
  row("2026-11-05", 4, { events: 3, red_pct: 14 }),
  row("2026-11-06", 5, { events: 5, red_pct: 6 }),
];

describe("todayKpis", () => {
  it("con pocas lecturas hoy, ningún indicador de datos da un número", () => {
    const ks = todayKpis([...history, row(TODAY, 1, { readings: KPI.minReadings - 1 })], TODAY);
    expect(ks).toHaveLength(4);
    for (const k of ks) {
      expect(k.state).toBe("nodata");
      expect(k.value).toBe("—");
    }
  });

  it("sin filas de hoy tampoco hay números", () => {
    expect(todayKpis(history, TODAY).every((k) => k.state === "nodata")).toBe(true);
  });

  it("momentos: dentro, por encima y por debajo de lo habitual (rango 2 a 6)", () => {
    const within = todayKpis([...history, row(TODAY, 1, { events: 4 })], TODAY)[0];
    expect(within.value).toBe("4");
    expect(within.sentence).toBe("Dentro de lo habitual.");
    expect(within.reference).toContain("2 a 6");
    expect(within.reference).toContain("mediana 4");
    expect(todayKpis([...history, row(TODAY, 1, { events: 9 })], TODAY)[0].sentence).toMatch(/Más momentos/);
    expect(todayKpis([...history, row(TODAY, 1, { events: 0 })], TODAY)[0].sentence).toMatch(/Menos momentos/);
  });

  it("momentos: con menos de 3 días escolares no dice qué es lo habitual", () => {
    const k = todayKpis([history[0], history[1], row(TODAY, 1)], TODAY)[0];
    expect(k.sentence).toMatch(/no hay suficientes días/);
  });

  it("la línea base ignora fines de semana, días con pocas lecturas y días de hoy en adelante", () => {
    const rows = [
      ...history,
      row("2026-11-07", 6, { events: 40 }), // sábado
      row("2026-11-01", 7, { events: 40 }), // domingo
      row("2026-10-30", 5, { events: 50, readings: 5 }), // pocas lecturas
      row(TODAY, 1, { events: 4 }),
    ];
    expect(todayKpis(rows, TODAY)[0].reference).toContain("2 a 6");
  });

  it("ruido, temperatura y luz muestran el porcentaje de hoy", () => {
    const ks = todayKpis([...history, row(TODAY, 1, { red_pct: 31.4, temp_ok_pct: 72, light_ok_pct: 55 })], TODAY);
    const [, ruido, temp, luz] = ks;
    expect(ruido.value).toBe("31 %");
    expect(ruido.sentence).toMatch(/Más tiempo con ruido alto/);
    expect(temp.value).toBe("72 %");
    expect(luz.value).toBe("55 %");
  });

  it("un sensor sin datos (null) no inventa un porcentaje", () => {
    const ks = todayKpis([...history, row(TODAY, 1, { temp_ok_pct: null })], TODAY);
    expect(ks[2].state).toBe("nodata");
  });

  it("ninguna frase usa lenguaje clínico, de causa ni de mejoría o empeoramiento", () => {
    const rows = [...history, row(TODAY, 1, { events: 9, red_pct: 40 })];
    const all = [...todayKpis(rows, TODAY), ...todayKpis(history, TODAY), coverageKpi([null], null), coverageKpi([0], 0), coverageKpi([], null)];
    for (const k of all) {
      expect(`${k.title} ${k.sentence} ${k.reference}`).not.toMatch(CLINICAL);
    }
  });
});

describe("coverageKpi", () => {
  const H = 3600_000;
  it("todos con señal y caja activa: ok", () => {
    const k = coverageKpi([H, 2 * H], 60_000);
    expect(k.value).toBe("100 %");
    expect(k.state).toBe("ok");
  });
  it("menos del 80 % de juguetes avisa que 'sin momentos' puede ser apagado", () => {
    const k = coverageKpi([H, null, 30 * H], 60_000);
    expect(k.value).toBe("33 %");
    expect(k.state).toBe("info");
    expect(k.sentence).toMatch(/apagados/);
  });
  it("caja sin señal en 24 h lo dice aunque los juguetes estén bien", () => {
    const k = coverageKpi([H], 30 * H);
    expect(k.state).toBe("info");
    expect(k.sentence).toMatch(/caja/);
  });
  it("sin juguetes vinculados no hay porcentaje", () => {
    expect(coverageKpi([], 60_000).state).toBe("nodata");
  });
});

describe("weekSummary", () => {
  // Semana pasada: 2026-11-02 a 2026-11-08. Hoy es miércoles 2026-11-11: la semana actual empieza el lunes 09.
  const rows = [
    row("2026-11-02", 1, { events: 2, red_pct: 10 }),
    row("2026-11-03", 2, { events: 4, red_pct: 20 }),
    row("2026-11-04", 3, { events: 6, red_pct: 10 }),
    row("2026-11-05", 4, { events: 90, red_pct: 90 }), // fuera del tramo comparable (después del miércoles)
    row("2026-11-09", 1, { events: 1, red_pct: 5 }),
    row("2026-11-10", 2, { events: 3, red_pct: 15 }),
    row("2026-11-11", 3, { events: 5, red_pct: 10 }),
  ];
  it("compara lunes a hoy con el mismo tramo de la semana anterior", () => {
    const w = weekSummary(rows, "2026-11-11");
    expect(w.events).toBe(9);
    expect(w.prevEvents).toBe(12);
    expect(w.daysWithData).toBe(3);
    expect(w.redPct).toBeCloseTo(10, 5);
    expect(w.prevRedPct).toBeCloseTo((10 + 20 + 10) / 3, 5);
  });
  it("el domingo cuenta la semana completa (lunes a domingo)", () => {
    expect(weekSummary(rows, "2026-11-08").events).toBe(2 + 4 + 6 + 90);
  });
  it("sin semana anterior no inventa comparación", () => {
    const w = weekSummary(rows.slice(4), "2026-11-11");
    expect(w.prevEvents).toBeNull();
    expect(weekSentences(w)[0]).toBe("Esta semana: 9 momentos.");
  });
  it("sin lecturas esta semana lo dice y no usa lenguaje clínico", () => {
    const w = weekSummary(rows.slice(0, 3), "2026-11-11");
    expect(weekSentences(w)).toEqual(["Esta semana todavía no hay lecturas del salón."]);
    for (const s of weekSentences(weekSummary(rows, "2026-11-11"))) expect(s).not.toMatch(CLINICAL);
  });
});
