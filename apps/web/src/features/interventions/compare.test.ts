import { describe, expect, it } from "vitest";
import { interventionSummary, INTERVENTION_CAVEAT, type CompareRow } from "./compare";
import { interventionInput } from "./schemas";

const row = (period: string, days: number, perDay: number): CompareRow => ({
  period,
  days_with_data: days,
  events: Math.round(days * perDay),
  events_per_day: perDay,
});

const CLINICAL = /ansiedad|ansios|crisis|meltdown|diagn|trastorno|caus|detect|provoc|desencaden|mejor[ií]a|mejor[oó]|empeor|retroces|progres|funcion[oó]|eficaz|efect/i;

describe("interventionSummary", () => {
  it("sin 5 días con datos de cada lado no compara", () => {
    const s = interventionSummary([row("antes", 10, 5), row("despues", 3, 2)]);
    expect(s).toContain("no hay suficientes días");
    expect(s).toContain("antes: 10, después: 3");
  });

  it("sin filas tampoco afirma nada", () => {
    expect(interventionSummary([])).toContain("no hay suficientes días");
  });

  it("compara momentos por día", () => {
    expect(interventionSummary([row("antes", 8, 6), row("despues", 8, 3)])).toContain("menor");
    expect(interventionSummary([row("antes", 8, 3), row("despues", 8, 6)])).toContain("mayor");
    expect(interventionSummary([row("antes", 8, 5), row("despues", 8, 5.5)])).toContain("similar");
  });

  it("incluye promedios y días con datos", () => {
    const s = interventionSummary([row("antes", 8, 6), row("despues", 7, 3)]);
    expect(s).toContain("6 momentos por día (8 días con datos)");
    expect(s).toContain("3 (7 días con datos)");
  });

  it("nunca usa lenguaje clínico, de causa, de eficacia ni de mejoría", () => {
    const outs = [
      interventionSummary([row("antes", 8, 6), row("despues", 8, 3)]),
      interventionSummary([row("antes", 8, 3), row("despues", 8, 6)]),
      interventionSummary([]),
    ];
    for (const s of outs) expect(s).not.toMatch(CLINICAL);
  });

  it("el aviso aclara que no demuestra causa", () => {
    expect(INTERVENTION_CAVEAT).toContain("no demuestra");
  });
});

describe("interventionInput", () => {
  const ok = { childId: "3c528d24-a3f4-4369-8939-46b5d300a6ef", title: "Cambió de lugar", startedOn: "2026-11-04", note: "" };

  it("acepta un ajuste válido", () => {
    expect(interventionInput.safeParse(ok).success).toBe(true);
  });

  it("rechaza título vacío o muy largo, fecha mala y notas largas", () => {
    expect(interventionInput.safeParse({ ...ok, title: "  " }).success).toBe(false);
    expect(interventionInput.safeParse({ ...ok, title: "x".repeat(81) }).success).toBe(false);
    expect(interventionInput.safeParse({ ...ok, startedOn: "04/11/2026" }).success).toBe(false);
    expect(interventionInput.safeParse({ ...ok, note: "x".repeat(301) }).success).toBe(false);
    expect(interventionInput.safeParse({ ...ok, childId: "no-es-uuid" }).success).toBe(false);
  });
});
