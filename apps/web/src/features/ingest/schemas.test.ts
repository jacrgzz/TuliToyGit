import { describe, expect, it } from "vitest";
import { ingestMessage } from "./schemas";

const press = {
  type: "press",
  device_id: "tuli-toy-01",
  ts: "2026-11-09T10:23:05.120Z",
  ts_source: "ntp",
  seq: 1042,
};

const reading = {
  type: "reading",
  device_id: "tuli-box-01",
  ts: "2026-11-09T10:23:00.000Z",
  ts_source: "ntp",
  seq: 5531,
  window_s: 10,
  noise_avg: 54.2,
  noise_peak: 71.8,
  light_lux: 680,
  temp_c: 24.1,
  humidity_pct: 48.0,
};

describe("contrato v1: mensajes válidos", () => {
  it("acepta la pulsación del contrato", () => {
    expect(ingestMessage.safeParse(press).success).toBe(true);
  });

  it("acepta la lectura del contrato", () => {
    expect(ingestMessage.safeParse(reading).success).toBe(true);
  });

  it("acepta una lectura con solo algunos sensores (los demás se omiten)", () => {
    const { noise_avg, noise_peak, light_lux, ...partial } = reading;
    void noise_avg; void noise_peak; void light_lux;
    expect(ingestMessage.safeParse(partial).success).toBe(true);
  });

  it("acepta sensores en null", () => {
    expect(
      ingestMessage.safeParse({ ...reading, temp_c: null, humidity_pct: null }).success,
    ).toBe(true);
  });

  it("acepta mensajes sin ts (dispositivo sin reloj)", () => {
    const { ts, ts_source, ...noClock } = press;
    void ts; void ts_source;
    expect(ingestMessage.safeParse(noClock).success).toBe(true);
  });
});

describe("contrato v1: mensajes inválidos", () => {
  it("rechaza un type desconocido", () => {
    expect(ingestMessage.safeParse({ ...press, type: "tap" }).success).toBe(false);
  });

  it("rechaza campos de más (typo en el firmware)", () => {
    expect(ingestMessage.safeParse({ ...reading, temperature: 20 }).success).toBe(false);
  });

  it("rechaza que una pulsación traiga campos de sensor", () => {
    expect(ingestMessage.safeParse({ ...press, noise_avg: 50 }).success).toBe(false);
  });

  it("rechaza seq faltante, negativo o decimal", () => {
    const { seq, ...noSeq } = press;
    void seq;
    expect(ingestMessage.safeParse(noSeq).success).toBe(false);
    expect(ingestMessage.safeParse({ ...press, seq: -1 }).success).toBe(false);
    expect(ingestMessage.safeParse({ ...press, seq: 1.5 }).success).toBe(false);
  });

  it("rechaza ts que no es ISO 8601", () => {
    expect(ingestMessage.safeParse({ ...press, ts: "ayer" }).success).toBe(false);
  });

  it("rechaza ts_source desconocido", () => {
    expect(ingestMessage.safeParse({ ...press, ts_source: "gps" }).success).toBe(false);
  });

  it("rechaza humedad fuera de 0 a 100", () => {
    expect(ingestMessage.safeParse({ ...reading, humidity_pct: 120 }).success).toBe(false);
    expect(ingestMessage.safeParse({ ...reading, humidity_pct: -1 }).success).toBe(false);
  });

  it("rechaza temperatura y ruido fuera de rango físico", () => {
    expect(ingestMessage.safeParse({ ...reading, temp_c: 200 }).success).toBe(false);
    expect(ingestMessage.safeParse({ ...reading, noise_peak: 500 }).success).toBe(false);
  });

  it("rechaza device_id vacío y window_s no positivo", () => {
    expect(ingestMessage.safeParse({ ...press, device_id: "" }).success).toBe(false);
    expect(ingestMessage.safeParse({ ...reading, window_s: 0 }).success).toBe(false);
  });
});
