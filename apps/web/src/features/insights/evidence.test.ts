import { describe, expect, it } from "vitest";
import { effectiveLift, evidenceFor, formatLift, notableConditions, summarize, type LiftRow } from "./evidence";
import { parsePeriod } from "@/lib/period";

const row = (over: Partial<LiftRow>): LiftRow => ({
  condition: "ruido_pico",
  events_total: 12,
  events_with: 9,
  event_pct: 75,
  baseline_total: 500,
  baseline_pct: 30,
  lift: 2.5,
  wilson_low: 47,
  wilson_high: 91,
  ...over,
});

// Palabras que nunca deben aparecer en las frases (skill marca-tuli): solo coincidencias.
const CLINICAL = /ansiedad|ansios|crisis|meltdown|diagn|trastorno|caus|detect|provoc|desencaden/i;

describe("evidenceFor", () => {
  it("menos de 5 momentos es insuficiente", () => {
    expect(evidenceFor(row({ events_total: 4 }))).toBe("insuficiente");
  });

  it("línea base con muy pocas ventanas es insuficiente", () => {
    expect(evidenceFor(row({ baseline_total: 10 }))).toBe("insuficiente");
  });

  it("10+ momentos, razón ≥ 1.5 y Wilson inferior sobre la base es alta", () => {
    expect(evidenceFor(row({}))).toBe("alta");
  });

  it("si el Wilson inferior no supera la base, a lo más es media", () => {
    expect(evidenceFor(row({ wilson_low: 25 }))).toBe("media");
  });

  it("entre 5 y 9 momentos con razón ≥ 1.5 es media", () => {
    expect(evidenceFor(row({ events_total: 6, events_with: 5 }))).toBe("media");
  });

  it("razón menor a 1.5 es sin coincidencia notable", () => {
    expect(evidenceFor(row({ lift: 1.2 }))).toBe("sin_coincidencia");
  });

  it("condición que nunca aparece en la base pero sí antes de momentos cuenta como notable", () => {
    const r = row({ lift: null, baseline_pct: 0, events_with: 6 });
    expect(effectiveLift(r)).toBe(Infinity);
    expect(evidenceFor(r)).not.toBe("sin_coincidencia");
  });

  it("condición que no aparece nunca no es notable", () => {
    expect(evidenceFor(row({ lift: null, baseline_pct: 0, events_with: 0, event_pct: 0 }))).toBe("sin_coincidencia");
  });
});

describe("formatLift", () => {
  it("redondea a un decimal y limita valores grandes", () => {
    expect(formatLift(1.894)).toBe("1.9×");
    expect(formatLift(12)).toBe("más de 10×");
    expect(formatLift(Infinity)).toBe("solo antes de sus momentos");
  });
});

describe("notableConditions", () => {
  it("ordena primero la evidencia alta y luego por razón", () => {
    const out = notableConditions([
      row({ condition: "luz_brusca", lift: 4, wilson_low: 20 }), // media (Wilson bajo)
      row({ condition: "ruido_pico", lift: 2 }), // alta
      row({ condition: "calor", lift: 1.1 }), // no notable
    ]);
    expect(out.map((x) => x.row.condition)).toEqual(["ruido_pico", "luz_brusca"]);
  });
});

describe("summarize", () => {
  it("con pocos momentos lo dice y no afirma nada", () => {
    const s = summarize([row({ events_total: 3, events_with: 2 })]);
    expect(s).toHaveLength(1);
    expect(s[0]).toContain("pocos momentos");
  });

  it("sin condiciones notables lo dice", () => {
    const s = summarize([row({ lift: 1 }), row({ condition: "calor", lift: 0.8 })]);
    expect(s[0]).toContain("ninguna condición");
  });

  it("redacta como coincidencia, con porcentajes y nivel de evidencia", () => {
    const [s] = summarize([row({})]);
    expect(s).toContain("coinciden 2.5×");
    expect(s).toContain("75 %");
    expect(s).toContain("30 %");
    expect(s).toContain("evidencia alta");
  });

  it("máximo dos frases", () => {
    const rows = ["ruido_pico", "luz_brusca", "calor"].map((c) => row({ condition: c }));
    expect(summarize(rows)).toHaveLength(2);
  });

  it("ninguna frase usa lenguaje clínico ni de causa", () => {
    const cases = [
      [row({})],
      [row({ events_total: 2 })],
      [row({ lift: 1 })],
      [row({ lift: null, baseline_pct: 0, events_with: 6 })],
      [row({ condition: "luz_brusca", lift: 3 }), row({ condition: "humedad_alta", lift: 2 })],
    ];
    for (const rows of cases) for (const s of summarize(rows)) expect(s).not.toMatch(CLINICAL);
  });
});

describe("parsePeriod", () => {
  it("acepta 7, 30 y 90; lo demás usa el valor por defecto", () => {
    expect(parsePeriod("7")).toBe(7);
    expect(parsePeriod("90")).toBe(90);
    expect(parsePeriod("15")).toBe(30);
    expect(parsePeriod(undefined)).toBe(30);
    expect(parsePeriod(["30", "7"])).toBe(30);
  });
});
