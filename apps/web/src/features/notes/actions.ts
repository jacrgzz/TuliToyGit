"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { eventNoteInput } from "./schemas";

export type ActionResult = { ok: true } | { ok: false; error: string };

// Guarda la nota y la marca de pulsación accidental de un momento. Una sola nota por momento.
// Se actualiza primero y, si no había nota, se inserta: un upsert intentaría cambiar event_id,
// columna a la que el docente no tiene permiso de actualización (a propósito).
export async function saveEventNote(input: unknown): Promise<ActionResult> {
  const parsed = eventNoteInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  const { eventId, note, accidental } = parsed.data;

  const supabase = await createClient();
  const upd = await supabase.from("event_notes").update({ note, accidental }).eq("event_id", eventId).select("id");
  if (upd.error) return { ok: false, error: "Solo el docente de este salón puede hacer esto." };

  if (!upd.data || upd.data.length === 0) {
    const ins = await supabase.from("event_notes").insert({ event_id: eventId, note, accidental });
    if (ins.error) {
      return {
        ok: false,
        error: ins.error.code === "42501" ? "Solo el docente de este salón puede hacer esto." : "No se pudo guardar. Intenta de nuevo.",
      };
    }
  }
  revalidatePath("/dashboard", "layout");
  return { ok: true };
}

export async function deleteEventNote(eventId: unknown): Promise<ActionResult> {
  if (typeof eventId !== "number" || !Number.isInteger(eventId) || eventId <= 0) {
    return { ok: false, error: "Momento inválido" };
  }
  const supabase = await createClient();
  const { error } = await supabase.from("event_notes").delete().eq("event_id", eventId);
  if (error) return { ok: false, error: "Solo el docente de este salón puede hacer esto." };
  revalidatePath("/dashboard", "layout");
  return { ok: true };
}
