"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { localInputToUtcISO } from "@/lib/time-mx";
import { activityInput } from "./schemas";
import { z } from "zod";

export type ActionResult = { ok: true } | { ok: false; error: string };

// Las escrituras usan el cliente DEL USUARIO: RLS decide (solo el docente del salón puede).
const denied = (code?: string) =>
  code === "42501" ? "Solo el docente de este salón puede hacer esto." : "No se pudo guardar. Intenta de nuevo.";

export async function createActivity(input: unknown): Promise<ActionResult> {
  const parsed = activityInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  const v = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.from("classroom_activities").insert({
    classroom_id: v.classroomId,
    kind: v.kind,
    name: v.name,
    starts_at: localInputToUtcISO(v.starts),
    ends_at: localInputToUtcISO(v.ends),
  });
  if (error) return { ok: false, error: denied(error.code) };
  revalidatePath("/dashboard", "layout");
  return { ok: true };
}

export async function deleteActivity(id: unknown): Promise<ActionResult> {
  const parsed = z.uuid().safeParse(id);
  if (!parsed.success) return { ok: false, error: "Actividad inválida" };
  const supabase = await createClient();
  const { data, error } = await supabase.from("classroom_activities").delete().eq("id", parsed.data).select("id");
  if (error) return { ok: false, error: denied(error.code) };
  // RLS no da error al borrar lo que no puedes ver: simplemente no borra nada.
  if (!data || data.length === 0) return { ok: false, error: "No se encontró la actividad o no tienes permiso." };
  revalidatePath("/dashboard", "layout");
  return { ok: true };
}
