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

export async function getChild(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("children")
    .select("id, display_name, classroom_id")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`No se pudo cargar el niño: ${error.message}`);
  return data;
}

export async function getClassroom(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("classrooms")
    .select("id, name")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`No se pudo cargar el salón: ${error.message}`);
  return data;
}

export async function listClassroomChildren(classroomId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("children")
    .select("id, display_name, classroom_id")
    .eq("classroom_id", classroomId)
    .order("display_name");
  if (error) throw new Error(`No se pudieron cargar los niños del salón: ${error.message}`);
  return data;
}

// Salones que el usuario puede ver (RLS): el docente, los suyos; el admin, todos.
export async function listMyClassrooms() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("classrooms").select("id, name").order("name");
  if (error) throw new Error(`No se pudieron cargar los salones: ${error.message}`);
  return data;
}
