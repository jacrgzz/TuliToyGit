import { describe, expect, it } from "vitest";
import { clampPct, parsePct } from "./Ring";

describe("Ring", () => {
  it("limita el porcentaje a 0–100 y redondea", () => {
    expect(clampPct(-5)).toBe(0);
    expect(clampPct(140)).toBe(100);
    expect(clampPct(57.6)).toBe(58);
    expect(clampPct(Number.NaN)).toBe(0);
  });

  it("lee porcentajes en texto y descarta lo demás", () => {
    expect(parsePct("12 %")).toBe(12);
    expect(parsePct("86%")).toBe(86);
    expect(parsePct("4,5 %")).toBe(5);
    expect(parsePct("5")).toBeNull();
    expect(parsePct("—")).toBeNull();
  });
});
