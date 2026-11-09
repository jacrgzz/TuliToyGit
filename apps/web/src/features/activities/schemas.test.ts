import { describe, expect, it } from "vitest";
import { activityInput } from "./schemas";
import { eventNoteInput } from "../notes/schemas";
import { isLocalInput, localInputToUtcISO, utcToLocalInput } from "@/lib/time-mx";

const base = {
  classroomId: "3c528d24-a3f4-4369-8939-46b5d300a6ef",
  kind: "recreo",
  name: "Recreo",
  starts: "2026-11-04T10:30",
  ends: "2026-11-04T11:00",
};

describe("activityInput", () => {
  it("acepta una actividad válida", () => {
    expect(activityInput.safeParse(base).success).toBe(true);
  });

  it("rechaza fin antes del inicio, más de 12 horas, tipo desconocido y nombre vacío", () => {
    expect(activityInput.safeParse({ ...base, ends: "2026-11-04T10:00" }).success).toBe(false);
    expect(activityInput.safeParse({ ...base, ends: "2026-11-05T11:00" }).success).toBe(false);
    expect(activityInput.safeParse({ ...base, kind: "juego" }).success).toBe(false);
    expect(activityInput.safeParse({ ...base, name: " " }).success).toBe(false);
    expect(activityInput.safeParse({ ...base, starts: "ayer" }).success).toBe(false);
  });
});

describe("eventNoteInput", () => {
  it("acepta nota y marca; rechaza notas de más de 500 caracteres y ids malos", () => {
    expect(eventNoteInput.safeParse({ eventId: 4, note: "ok", accidental: true }).success).toBe(true);
    expect(eventNoteInput.safeParse({ eventId: 4, note: "x".repeat(501), accidental: false }).success).toBe(false);
    expect(eventNoteInput.safeParse({ eventId: 0, note: "", accidental: false }).success).toBe(false);
    expect(eventNoteInput.safeParse({ eventId: 1.5, note: "", accidental: false }).success).toBe(false);
  });
});

describe("hora de México", () => {
  it("convierte de hora local a UTC (UTC−6) y de regreso", () => {
    expect(localInputToUtcISO("2026-11-04T10:30")).toBe("2026-11-04T16:30:00.000Z");
    expect(utcToLocalInput("2026-11-04T16:30:00.000Z")).toBe("2026-11-04T10:30");
  });

  it("cruza la medianoche correctamente", () => {
    expect(localInputToUtcISO("2026-11-04T20:00")).toBe("2026-11-05T02:00:00.000Z");
    expect(utcToLocalInput("2026-11-05T02:00:00.000Z")).toBe("2026-11-04T20:00");
  });

  it("valida el formato", () => {
    expect(isLocalInput("2026-11-04T10:30")).toBe(true);
    expect(isLocalInput("2026-11-04 10:30")).toBe(false);
    expect(isLocalInput("2026-13-45T10:30")).toBe(false);
  });
});
