import { createClient } from "@/lib/supabase/server";

// RLS: la nota solo la ven los docentes del salón y el admin; un tutor recibe null.
export async function getEventNote(eventId: number) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("event_notes")
    .select("note, accidental, updated_at")
    .eq("event_id", eventId)
    .maybeSingle();
  if (error) throw new Error(`No se pudo cargar la nota: ${error.message}`);
  return data;
}
