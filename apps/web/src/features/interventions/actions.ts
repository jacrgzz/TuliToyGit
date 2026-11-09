"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { interventionInput } from "./schemas";

export type ActionResult = { ok: true } | { ok: false; error: string };

const denied = (code?: string) =>
  code === "42501" ? "Solo el docente de este niño puede hacer esto." : "No se pudo guardar. Intenta de nuevo.";

export async function createIntervention(input: unknown): Promise<ActionResult> {
  const parsed = interventionInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  const v = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase
    .from("interventions")
    .insert({ child_id: v.childId, title: v.title, started_on: v.startedOn, note: v.note });
  if (error) return { ok: false, error: denied(error.code) };
  revalidatePath("/dashboard", "layout");
  return { ok: true };
}

export async function deleteIntervention(id: unknown): Promise<ActionResult> {
  const parsed = z.uuid().safeParse(id);
  if (!parsed.success) return { ok: false, error: "Ajuste inválido" };
  const supabase = await createClient();
  const { data, error } = await supabase.from("interventions").delete().eq("id", parsed.data).select("id");
  if (error) return { ok: false, error: denied(error.code) };
  if (!data || data.length === 0) return { ok: false, error: "No se encontró el ajuste o no tienes permiso." };
  revalidatePath("/dashboard", "layout");
  return { ok: true };
}
