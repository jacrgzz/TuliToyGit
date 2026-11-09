import { z } from "zod";

// ÚNICA definición del contrato v1 en código (docs/contrato-datos.md).
// La importan: /api/ingest, el simulador y las pruebas. No la copies.
// Los objetos son estrictos a propósito: un campo con typo en el firmware falla con 400
// y un mensaje claro, en lugar de perderse en silencio.

export const tsSource = z.enum(["ntp", "server", "unsynced"]);
export type TsSource = z.infer<typeof tsSource>;

// Los campos numéricos de sensor son opcionales/nulos: un sensor ausente se omite o va null.
const optionalNumber = (min: number, max: number) =>
  z.number().min(min).max(max).nullish();

const common = {
  device_id: z.string().min(1).max(64),
  // Hora del evento medida en el dispositivo (ISO 8601 UTC). Opcional si el dispositivo no tiene reloj.
  ts: z.iso.datetime().optional(),
  ts_source: tsSource.optional(),
  // Contador creciente por dispositivo; (device_id, seq) es único. Detecta pérdidas y duplicados.
  seq: z.number().int().nonnegative(),
  // Carga de la batería (0 a 100). Opcional: el servidor la guarda en devices y el panel avisa si es baja.
  battery_pct: optionalNumber(0, 100),
};

export const pressMessage = z
  .object({
    type: z.literal("press"),
    ...common,
  })
  .strict();

// Latido opcional: solo actualiza last_seen_at y la batería del dispositivo; no se guarda como evento.
export const heartbeatMessage = z
  .object({
    type: z.literal("heartbeat"),
    ...common,
  })
  .strict();

export const readingMessage = z
  .object({
    type: z.literal("reading"),
    ...common,
    window_s: z.number().int().positive().max(3600).nullish(),
    noise_avg: optionalNumber(0, 150), // dB aproximados; nunca audio
    noise_peak: optionalNumber(0, 150),
    light_lux: optionalNumber(0, 200_000),
    temp_c: optionalNumber(-40, 85),
    humidity_pct: optionalNumber(0, 100),
  })
  .strict();

export const ingestMessage = z.discriminatedUnion("type", [
  pressMessage,
  readingMessage,
  heartbeatMessage,
]);

export type PressMessage = z.infer<typeof pressMessage>;
export type ReadingMessage = z.infer<typeof readingMessage>;
export type HeartbeatMessage = z.infer<typeof heartbeatMessage>;
export type IngestMessage = z.infer<typeof ingestMessage>;

// Tamaño máximo del cuerpo (bytes). Los mensajes reales pesan menos de 300.
export const MAX_BODY_BYTES = 4096;
