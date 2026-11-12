import { describe, expect, it } from "vitest";
import { KPI } from "@/lib/thresholds";
import { toyCare } from "../devices/care";
import { childToday, childWeek, familyCoincidence, meetingQuestions, roomToday, TOY_IS_OK, type ChildDay } from "./family";
import type { DailyStat } from "./kpis";

const CLINICAL = /ansiedad|ansios|crisis|meltdown|diagn|trastorno|caus|detect|provoc|desencaden|sufr|enferm|mejor[ií]a|empeor|retroces|progres|normal para su edad|promedio del sal/i;
const R = KPI.minReadings;

// 2026-11-11 es miércoles. Semana pasada: 2026-11-02 (lun) a 2026-11-06 (vie).
const TODAY = "2026-11-11";
const day = (d: string, events: number | null, readings = 100): ChildDay => ({ day: d, readings, events });
const lastWeek = [day("2026-11-02", 2), day("2026-11-03", 4), day("2026-11-04", 3), day("2026-11-05", 5), day("2026-11-06", 1)];

describe("childToday", () => {
  it("dentro de lo habitual: usa su propio rango", () => {
    const c = childToday([...lastWeek, day(TODAY, 3)], TODAY, "Alumno A");
    expect(c.value).toBe("3 veces");
    expect(c.tone).toBe("calm");
    expect(c.sentence).toContain("dentro de lo habitual");
    expect(c.detail).toContain("entre 1 y 5");
  });
  it("más que de costumbre: tono informativo, nunca alarma", () => {
    const c = childToday([...lastWeek, day(TODAY, 9)], TODAY, "Alumno A");
    expect(c.tone).toBe("info");
    expect(c.sentence).toContain("más veces");
  });
  it("una vez, en singular", () => {
    expect(childToday([...lastWeek, day(TODAY, 1)], TODAY, "A").value).toBe("1 vez");
  });
  it("sin lecturas hoy no inventa un número", () => {
    const c = childToday([...lastWeek, day(TODAY, null, 0)], TODAY, "A");
    expect(c.value).toBeUndefined();
    expect(c.tone).toBe("nodata");
  });
  it("pocas lecturas: muestra el número sin comparar", () => {
    const c = childToday([...lastWeek, day(TODAY, 2, R - 1)], TODAY, "A");
    expect(c.value).toBe("2 veces");
    expect(c.detail).toBeUndefined();
  });
  it("sin suficientes días anteriores no dice qué es lo habitual", () => {
    const c = childToday([day("2026-11-10", 2), day(TODAY, 3)], TODAY, "A");
    expect(c.sentence).toContain("Todavía no hay suficientes días");
  });
  it("los días sin datos no cuentan como cero en lo habitual", () => {
    const c = childToday([...lastWeek, day("2026-11-10", null, 0), day(TODAY, 3)], TODAY, "A");
    expect(c.detail).toContain("entre 1 y 5");
  });
  it("fin de semana: no hay clases", () => {
    expect(childToday(lastWeek, "2026-11-08", "A").sentence).toContain("no hay clases");
  });
});

describe("roomToday", () => {
  const stat = (red: number | null, readings = 100): DailyStat => ({
    day: TODAY, isodow: 3, readings, red_pct: red, temp_ok_pct: null, light_ok_pct: null, events: 0,
  });
  it("tranquilo, con algunos ratos o buena parte del día", () => {
    expect(roomToday([stat(5)], TODAY).sentence).toContain("tranquilo");
    expect(roomToday([stat(20)], TODAY).sentence).toContain("algunos ratos");
    expect(roomToday([stat(45)], TODAY).sentence).toContain("buena parte");
    expect(roomToday([stat(45)], TODAY).detail).toContain("45 %");
  });
  it("sin datos suficientes", () => {
    expect(roomToday([stat(5, R - 1)], TODAY).tone).toBe("nodata");
    expect(roomToday([], TODAY).tone).toBe("nodata");
  });
});

describe("childWeek", () => {
  it("compara con el mismo tramo de la semana pasada y cuenta días en lo de costumbre", () => {
    const rows = [...lastWeek, day("2026-11-09", 2), day("2026-11-10", 6), day(TODAY, 3)];
    const w = childWeek(rows, TODAY);
    expect(w.days.map((d) => d.events)).toEqual([2, 6, 3]);
    expect(w.sentences[0]).toBe("Esta semana usó su juguete 11 veces (la semana pasada a esta altura: 9).");
    // Mediana de la semana pasada: 3 → lunes (2) y miércoles (3) quedan igual o por debajo.
    expect(w.sentences[1]).toContain("2 de 3 días");
  });
  it("un día sin datos aparece como null, no como cero", () => {
    const w = childWeek([...lastWeek, day("2026-11-09", null, 0), day(TODAY, 1)], TODAY);
    expect(w.days.map((d) => d.events)).toEqual([null, null, 1]);
  });
  it("sin datos esta semana", () => {
    expect(childWeek(lastWeek, TODAY).sentences).toEqual(["Esta semana todavía no hay datos del salón."]);
  });
  it("en fin de semana muestra de lunes a viernes", () => {
    expect(childWeek(lastWeek, "2026-11-07").days).toHaveLength(5);
  });
});

describe("toyCare", () => {
  const H = 3600_000;
  it("sin señal nunca", () => {
    expect(toyCare({ ageMs: null, batteryPct: null, lastSeen: null }, 24 * H).tone).toBe("nodata");
  });
  it("batería baja: cargarlo esta noche", () => {
    const t = toyCare({ ageMs: H, batteryPct: 12, lastSeen: "hace 1 h" }, 24 * H);
    expect(t.sentence).toContain("Cárgalo esta noche");
    expect(t.value).toBe("12 %");
  });
  it("sin señal reciente: no afirma que esté apagado", () => {
    const t = toyCare({ ageMs: 48 * H, batteryPct: null, lastSeen: "hace 2 d" }, 24 * H);
    expect(t.sentence).toContain("puede ser normal");
  });
  it("funcionando", () => {
    expect(toyCare({ ageMs: H, batteryPct: 80, lastSeen: "hace 1 h" }, 24 * H).tone).toBe("calm");
  });
});

describe("familyCoincidence", () => {
  const lift = (events_total: number, lift: number, wilson_low: number) => ({
    condition: "ruido_pico", events_total, events_with: Math.round(events_total * 0.6), event_pct: 60,
    baseline_total: 500, baseline_pct: 20, lift, wilson_low,
  });
  it("pocos momentos: no concluye", () => {
    expect(familyCoincidence([lift(3, 3, 30)]).top).toBeNull();
  });
  it("con una coincidencia notable da la condición y su evidencia", () => {
    const c = familyCoincidence([lift(25, 3, 40)]);
    expect(c.top).toContain("picos de ruido");
    expect(c.sentence).toContain("evidencia alta");
  });
  it("sin coincidencia notable", () => {
    expect(familyCoincidence([lift(25, 1, 10)]).sentence).toContain("no vemos");
  });
});

describe("lenguaje para familias", () => {
  it("ninguna frase usa lenguaje clínico, de causa o de comparación con otros", () => {
    const rows = [...lastWeek, day(TODAY, 9)];
    const texts = [
      TOY_IS_OK,
      ...[0, 1, 3, 9].flatMap((n) => {
        const c = childToday([...lastWeek, day(TODAY, n)], TODAY, "A");
        return [c.sentence, c.detail ?? ""];
      }),
      ...[5, 20, 45].map((r) => roomToday([{ day: TODAY, isodow: 3, readings: 100, red_pct: r, temp_ok_pct: null, light_ok_pct: null, events: 0 }], TODAY).sentence),
      ...childWeek(rows, TODAY).sentences,
      ...meetingQuestions("picos de ruido de 75 dB o más"),
      familyCoincidence([]).sentence,
      toyCare({ ageMs: 1, batteryPct: 5, lastSeen: "hace 1 s" }, 10).sentence,
    ];
    for (const t of texts) expect(t).not.toMatch(CLINICAL);
  });
});
