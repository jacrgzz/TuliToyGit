import "server-only";
import type { createAdminClient } from "@/lib/supabase/admin";
import type { IngestMessage, TsSource } from "./schemas";
import { resolveTimestamp } from "./time";

// Inserta un mensaje YA validado del contrato en la base. Lo usan /api/ingest
// (dispositivos reales o simulados) y las acciones de /demo (teléfono).
// Solo vive en features/ingest porque usa el cliente admin (service_role).

export type DeviceRow = {
  device_id: string;
  kind: string;
  child_id: string | null;
  classroom_id: string | null;
};

export type StoreResult =
  | { kind: "ok"; source: TsSource }
  | { kind: "wrong_device"; detail: string }
  | { kind: "duplicate"; seq: number }
  | { kind: "error"; detail: string };

type Admin = ReturnType<typeof createAdminClient>;

export async function storeMessage(
  admin: Admin,
  device: DeviceRow,
  msg: IngestMessage,
  receivedAt: Date,
): Promise<StoreResult> {
  const { at, source } = resolveTimestamp(msg.ts, msg.ts_source, receivedAt);
  let insertError: { code?: string; message: string } | null = null;

  if (msg.type === "heartbeat") {
    // Sin fila de evento ni de lectura: solo last_seen_at y la batería (más abajo).
  } else if (msg.type === "press") {
    if (device.kind !== "toy" || !device.child_id) {
      return { kind: "wrong_device", detail: "este dispositivo no es un juguete" };
    }
    const { error } = await admin.from("toy_events").insert({
      device_id: device.device_id,
      child_id: device.child_id,
      occurred_at: at.toISOString(),
      received_at: receivedAt.toISOString(),
      ts_source: source,
      seq: msg.seq,
    });
    insertError = error;
  } else {
    if (device.kind !== "box" || !device.classroom_id) {
      return { kind: "wrong_device", detail: "este dispositivo no es una caja" };
    }
    const { error } = await admin.from("sensor_readings").insert({
      device_id: device.device_id,
      classroom_id: device.classroom_id,
      measured_at: at.toISOString(),
      received_at: receivedAt.toISOString(),
      ts_source: source,
      seq: msg.seq,
      window_s: msg.window_s ?? null,
      noise_avg: msg.noise_avg ?? null,
      noise_peak: msg.noise_peak ?? null,
      light_lux: msg.light_lux ?? null,
      temp_c: msg.temp_c ?? null,
      humidity_pct: msg.humidity_pct ?? null,
    });
    insertError = error;
  }

  if (insertError) {
    // 23505 = violación de unicidad: (device_id, seq) repetido → idempotente
    if (insertError.code === "23505") return { kind: "duplicate", seq: msg.seq };
    return { kind: "error", detail: insertError.message };
  }

  const deviceUpdate: { last_seen_at: string; battery_pct?: number; battery_at?: string } = {
    last_seen_at: receivedAt.toISOString(),
  };
  if (msg.battery_pct !== undefined && msg.battery_pct !== null) {
    deviceUpdate.battery_pct = msg.battery_pct;
    deviceUpdate.battery_at = receivedAt.toISOString();
  }
  await admin.from("devices").update(deviceUpdate).eq("device_id", device.device_id);

  return { kind: "ok", source };
}
