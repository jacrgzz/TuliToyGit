"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { DEMO_BOX_ID, DEMO_TOY_ID, demoEnabled } from "./demo";
import { ingestMessage } from "./schemas";
import { storeMessage, type DeviceRow } from "./store";

export type DemoResult = { ok: true } | { ok: false; error: string };

export type DemoReadingInput = {
  noise_avg: number;
  noise_peak: number;
  light_lux: number;
  temp_c: number;
  humidity_pct: number;
};

// seq único por dispositivo: milisegundos x 1000 + aleatorio (cabe en un entero seguro de JS).
const nextSeq = () => Date.now() * 1000 + Math.floor(Math.random() * 1000);

// Comprueba: modo demo activo, sesión válida y que el usuario (vía RLS) pueda ver el dispositivo
// demo, es decir, que esté vinculado a ese niño o salón. Devuelve el dispositivo.
async function authorizeDemoDevice(deviceId: string): Promise<{ device: DeviceRow } | { error: string }> {
  if (!demoEnabled()) return { error: "El modo demo está desactivado." };

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: "Inicia sesión para usar el modo demo." };

  const { data: visible } = await supabase
    .from("devices")
    .select("device_id")
    .eq("device_id", deviceId)
    .maybeSingle();
  if (!visible) {
    return { error: "Tu cuenta no está vinculada a los dispositivos demo." };
  }

  const admin = createAdminClient();
  const { data: device } = await admin
    .from("devices")
    .select("device_id, kind, child_id, classroom_id")
    .eq("device_id", deviceId)
    .maybeSingle();
  if (!device) return { error: "Falta el dispositivo demo. Corre npm run provision." };
  return { device };
}

export async function sendDemoPress(): Promise<DemoResult> {
  const auth = await authorizeDemoDevice(DEMO_TOY_ID);
  if ("error" in auth) return { ok: false, error: auth.error };

  const now = new Date();
  const msg = ingestMessage.parse({
    type: "press",
    device_id: DEMO_TOY_ID,
    ts: now.toISOString(),
    ts_source: "ntp",
    seq: nextSeq(),
  });
  const result = await storeMessage(createAdminClient(), auth.device, msg, now);
  return result.kind === "ok" ? { ok: true } : { ok: false, error: "No se pudo registrar el momento." };
}

export async function sendDemoReading(input: DemoReadingInput): Promise<DemoResult> {
  const auth = await authorizeDemoDevice(DEMO_BOX_ID);
  if ("error" in auth) return { ok: false, error: auth.error };

  const now = new Date();
  const parsed = ingestMessage.safeParse({
    type: "reading",
    device_id: DEMO_BOX_ID,
    ts: now.toISOString(),
    ts_source: "ntp",
    seq: nextSeq(),
    window_s: 10,
    ...input,
  });
  if (!parsed.success) return { ok: false, error: "Valores fuera de rango." };

  const result = await storeMessage(createAdminClient(), auth.device, parsed.data, now);
  return result.kind === "ok" ? { ok: true } : { ok: false, error: "No se pudo guardar la lectura." };
}
