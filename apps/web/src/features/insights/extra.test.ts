import { describe, expect, it } from "vitest";
import { isNoiseAlert, liveNoiseMessage, noiseSensitiveNames, type LiveNoise, type ProfileForAlert } from "./alerts";
import { comboSummary } from "./combo";
import { personalThreshold, thresholdSummary, type NoiseBin } from "./threshold";
import type { LiftRow } from "./evidence";

const CLINICAL = /ansiedad|ansios|crisis|meltdown|diagn|trastorno|caus|detect|provoc|desencaden|sufr|mal momento|enferm/i;

const bin = (bin_start: number, events_n: number, baseline_n: number): NoiseBin => ({
  bin_start,
  events_n,
  baseline_n,
  events_pct: 0,
  baseline_pct: 0,
});

describe("personalThreshold (A4)", () => {
  // 40 momentos; el resto del tiempo (1000 ventanas) casi nunca pasa de 75 dB
  const bins = [bin(50, 4, 700), bin(60, 6, 200), bin(70, 8, 80), bin(75, 12, 15), bin(80, 6, 5), bin(85, 4, 0)];

  it("encuentra el nivel desde el que sus momentos son más frecuentes que en el resto del tiempo", () => {
    // Desde 50 dB: 100 % de los momentos vs 100 % del tiempo (1×, no alcanza).
    // Desde 60 dB: 36 de 40 momentos (90 %) vs 300 de 1000 ventanas (30 %) = 3× → es el nivel más bajo que cumple.
    const t = personalThreshold(bins);
    expect(t).toEqual({ db: 60, lift: 3, eventsPct: 90, baselinePct: 30, eventsAbove: 36 });
  });

  it("con pocos momentos o poca línea base no afirma nada", () => {
    expect(personalThreshold([bin(70, 2, 500), bin(80, 1, 500)])).toBeNull();
    expect(personalThreshold([bin(70, 8, 5), bin(80, 4, 5)])).toBeNull();
  });

  it("si sus momentos se reparten igual que el resto del tiempo, no hay umbral", () => {
    const flat = [bin(50, 20, 500), bin(60, 20, 500), bin(70, 10, 250), bin(80, 2, 50)];
    expect(personalThreshold(flat)).toBeNull();
    expect(thresholdSummary(flat)).toContain("No se ve un nivel");
  });

  it("la frase menciona el nivel y los porcentajes, sin lenguaje clínico", () => {
    const s = thresholdSummary(bins);
    expect(s).toMatch(/Desde picos de unos \d+ dB/);
    expect(s).toContain("%");
    expect(s).not.toMatch(CLINICAL);
    expect(thresholdSummary([bin(70, 2, 100)])).not.toMatch(CLINICAL);
  });
});

describe("aviso en vivo (C2)", () => {
  const live = (over: Partial<LiveNoise> = {}): LiveNoise => ({ readings_n: 8, high_n: 8, age_ms: 10_000, avg_peak: 88, ...over });

  it("avisa con lecturas suficientes, frescas y casi todas altas", () => {
    expect(isNoiseAlert(live())).toBe(true);
    expect(isNoiseAlert(live({ high_n: 7 }))).toBe(true); // 87 %
  });

  it("no avisa si hay pocas lecturas, son viejas o no son casi todas altas", () => {
    expect(isNoiseAlert(live({ readings_n: 2, high_n: 2 }))).toBe(false);
    expect(isNoiseAlert(live({ age_ms: 5 * 60_000 }))).toBe(false);
    expect(isNoiseAlert(live({ age_ms: null, readings_n: 0, high_n: 0 }))).toBe(false);
    expect(isNoiseAlert(live({ high_n: 4 }))).toBe(false); // 50 %
  });

  const profile = (name: string, cond: string | null, lift: number, n = 12): ProfileForAlert => ({
    display_name: name,
    top_condition: cond,
    top_lift: lift,
    top_events_total: n,
    top_events_with: 9,
    top_event_pct: 75,
    top_baseline_pct: 30,
    top_wilson_low: 47,
  });

  it("nombra solo a los niños con coincidencia de ruido con evidencia media o alta", () => {
    const names = noiseSensitiveNames([
      profile("Alumno A", "ruido_pico", 2.5),
      profile("Alumno B", "luz_brusca", 3.8),
      profile("Alumno C", null, 0),
      profile("Alumno D", "ruido_sostenido", 2, 3), // pocos momentos: evidencia insuficiente
    ]);
    expect(names).toEqual(["Alumno A"]);
  });

  it("el mensaje es neutral, sugiere actuar sobre el ambiente y no usa lenguaje clínico", () => {
    const m = liveNoiseMessage(live(), ["Alumno A", "Alumno C"])!;
    expect(m).toContain("Alumno A y Alumno C");
    expect(m).toContain("Quizá ayude");
    expect(m).not.toMatch(CLINICAL);
    expect(liveNoiseMessage(live(), [])).not.toContain("Quizá");
    expect(liveNoiseMessage(live({ readings_n: 1, high_n: 1 }), ["Alumno A"])).toBeNull();
  });
});

describe("comboSummary (A8)", () => {
  const row = (condition: string, k: number, lift: number | null, base: number): LiftRow => ({
    condition,
    events_total: 20,
    events_with: k,
    event_pct: (100 * k) / 20,
    baseline_total: 800,
    baseline_pct: base,
    lift,
    wilson_low: Math.max(0, (100 * k) / 20 - 20),
  });

  it("con pocos momentos no afirma nada", () => {
    expect(comboSummary([{ ...row("ambas", 1, 3, 5), events_total: 3 }])).toContain("pocos momentos");
  });

  it("destaca la combinación que más coincide", () => {
    const s = comboSummary([row("ambas", 12, 6, 10), row("solo_ruido", 4, 1, 20), row("solo_luz", 2, 0.5, 20), row("ninguna", 2, 0.2, 50)]);
    expect(s).toContain("ruido alto y cambio brusco de luz a la vez");
    expect(s).not.toMatch(CLINICAL);
  });

  it("si ninguna destaca, lo dice", () => {
    const s = comboSummary([row("ambas", 1, 1, 5), row("solo_ruido", 4, 1, 20), row("solo_luz", 4, 1, 20), row("ninguna", 11, 1, 55)]);
    expect(s).toContain("Ninguna combinación");
  });
});
