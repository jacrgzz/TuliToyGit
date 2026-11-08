import { createClient } from "@/lib/supabase/server";

// RLS decide qué niños ve cada usuario: tutor = sus hijos, docente = los de su salón.
export async function listMyChildren() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("children")
    .select("id, display_name, classroom_id")
    .order("display_name");
  if (error) throw new Error(`No se pudieron cargar los niños: ${error.message}`);
  return data;
}
