import "server-only";
import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { ingestMessage, MAX_BODY_BYTES } from "./schemas";
import { storeMessage } from "./store";

// Flujo (docs/arquitectura.md): verifica token → valida con zod → inserta → ingest_log.
// Con store.ts y demo-actions.ts es de los pocos lugares que usan el cliente admin (service_role).

type Outcome = "ok" | "invalid" | "unauthorized" | "duplicate" | "error";

type LogEntry = {
  device_id: string | null;
  type: string | null;
  status: number;
  outcome: Outcome;
  detail?: string;
};

function json(status: number, body: Record<string, unknown>) {
  return Response.json(body, { status });
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function handleIngest(request: Request): Promise<Response> {
  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch {
    // Falta SUPABASE_SERVICE_ROLE_KEY: responder JSON claro en vez de un 500 genérico.
    return json(500, { ok: false, error: "server_misconfigured" });
  }
  let log: LogEntry = {
    device_id: null,
    type: null,
    status: 500,
    outcome: "error",
  };

  // El log nunca debe romper la respuesta al dispositivo.
  const writeLog = async () => {
    try {
      await admin.from("ingest_log").insert({
        ...log,
        detail: log.detail?.slice(0, 500),
      });
    } catch {
      /* se ignora a propósito */
    }
  };
  const finish = async (entry: LogEntry, body: Record<string, unknown>) => {
    log = entry;
    await writeLog();
    return json(entry.status, body);
  };

  try {
    // 1. Token del dispositivo (antes de leer el cuerpo)
    const auth = request.headers.get("authorization") ?? "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
    if (!token) {
      return finish(
        { device_id: null, type: null, status: 401, outcome: "unauthorized", detail: "falta Authorization: Bearer" },
        { ok: false, error: "unauthorized" },
      );
    }
    const { data: device } = await admin
      .from("devices")
      .select("device_id, kind, child_id, classroom_id")
      .eq("token_hash", hashToken(token))
      .maybeSingle();
    if (!device) {
      return finish(
        { device_id: null, type: null, status: 401, outcome: "unauthorized", detail: "token no reconocido" },
        { ok: false, error: "unauthorized" },
      );
    }

    // 2. Cuerpo: tamaño y JSON
    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) {
      return finish(
        { device_id: device.device_id, type: null, status: 400, outcome: "invalid", detail: "cuerpo demasiado grande" },
        { ok: false, error: "invalid", detail: "cuerpo demasiado grande" },
      );
    }
    let payload: unknown;
    try {
      payload = JSON.parse(raw);
    } catch {
      return finish(
        { device_id: device.device_id, type: null, status: 400, outcome: "invalid", detail: "JSON inválido" },
        { ok: false, error: "invalid", detail: "JSON inválido" },
      );
    }

    // 3. Validación contra el contrato
    const parsed = ingestMessage.safeParse(payload);
    if (!parsed.success) {
      const issues = parsed.error.issues.map(
        (i) => `${i.path.join(".") || "(raíz)"}: ${i.message}`,
      );
      const type =
        typeof (payload as { type?: unknown })?.type === "string"
          ? (payload as { type: string }).type
          : null;
      return finish(
        { device_id: device.device_id, type, status: 400, outcome: "invalid", detail: issues.join("; ") },
        { ok: false, error: "invalid", issues },
      );
    }
    const msg = parsed.data;

    // El device_id del cuerpo debe coincidir con el del token.
    if (msg.device_id !== device.device_id) {
      return finish(
        { device_id: device.device_id, type: msg.type, status: 401, outcome: "unauthorized", detail: `device_id del cuerpo (${msg.device_id}) no coincide con el token` },
        { ok: false, error: "unauthorized", detail: "device_id no coincide con el token" },
      );
    }

    // 4. Inserción
    const result = await storeMessage(admin, device, msg, new Date());
    switch (result.kind) {
      case "wrong_device":
        return finish(
          { device_id: device.device_id, type: msg.type, status: 400, outcome: "invalid", detail: result.detail },
          { ok: false, error: "invalid", detail: result.detail },
        );
      case "duplicate":
        return finish(
          { device_id: device.device_id, type: msg.type, status: 409, outcome: "duplicate", detail: `seq ${result.seq} repetido` },
          { ok: true, duplicate: true },
        );
      case "error":
        return finish(
          { device_id: device.device_id, type: msg.type, status: 500, outcome: "error", detail: result.detail },
          { ok: false, error: "error" },
        );
      case "ok":
        return finish(
          { device_id: device.device_id, type: msg.type, status: 201, outcome: "ok", detail: result.source === "ntp" ? undefined : `ts_source=${result.source}` },
          { ok: true },
        );
    }
  } catch (e) {
    return finish(
      { ...log, status: 500, outcome: "error", detail: e instanceof Error ? e.message : "error desconocido" },
      { ok: false, error: "error" },
    );
  }
}
