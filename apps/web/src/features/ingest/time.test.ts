import { describe, expect, it } from "vitest";
import { resolveTimestamp } from "./time";

const now = new Date("2026-11-09T10:00:00.000Z");

describe("resolveTimestamp", () => {
  it("sin ts usa la hora de llegada con fuente server", () => {
    const r = resolveTimestamp(undefined, undefined, now);
    expect(r.at).toEqual(now);
    expect(r.source).toBe("server");
  });

  it("ts válido con ntp se respeta", () => {
    const r = resolveTimestamp("2026-11-09T09:59:30.000Z", "ntp", now);
    expect(r.at.toISOString()).toBe("2026-11-09T09:59:30.000Z");
    expect(r.source).toBe("ntp");
  });

  it("ts válido sin fuente declarada se asume ntp", () => {
    expect(resolveTimestamp("2026-11-09T09:59:30.000Z", undefined, now).source).toBe("ntp");
  });

  it("unsynced no confía en ts aunque venga", () => {
    const r = resolveTimestamp("2026-11-09T09:59:30.000Z", "unsynced", now);
    expect(r.at).toEqual(now);
    expect(r.source).toBe("unsynced");
  });

  it("ts más de 2 min en el futuro se reemplaza y se marca unsynced", () => {
    const r = resolveTimestamp("2026-11-09T10:05:00.000Z", "ntp", now);
    expect(r.at).toEqual(now);
    expect(r.source).toBe("unsynced");
  });

  it("ts un poco en el futuro (< 2 min) se tolera", () => {
    const r = resolveTimestamp("2026-11-09T10:01:00.000Z", "ntp", now);
    expect(r.at.toISOString()).toBe("2026-11-09T10:01:00.000Z");
    expect(r.source).toBe("ntp");
  });

  it("ts de hace horas (cola offline o backfill) se respeta", () => {
    const r = resolveTimestamp("2026-11-09T06:00:00.000Z", "ntp", now);
    expect(r.at.toISOString()).toBe("2026-11-09T06:00:00.000Z");
    expect(r.source).toBe("ntp");
  });

  it("ts de hace más de 7 días se reemplaza y se marca unsynced", () => {
    const r = resolveTimestamp("2026-10-01T10:00:00.000Z", "ntp", now);
    expect(r.at).toEqual(now);
    expect(r.source).toBe("unsynced");
  });
});
