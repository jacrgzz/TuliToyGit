import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Segunda barrera además del proxy: si no hay sesión, a /login.
export async function requireUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");
  return data.user;
}

export type ViewerRole = "admin" | "teacher" | "guardian";

// La vista (admin, docente o padre/tutor) se decide por los datos vinculados, no por el
// campo `role` del perfil: el rol por sí solo no da acceso a nada (ver migraciones).
// El admin es una fila en public.admins que solo service_role puede crear.
export async function getViewerRole(): Promise<ViewerRole> {
  const supabase = await createClient();
  const { data: adminRow } = await supabase.from("admins").select("profile_id").maybeSingle();
  if (adminRow) return "admin";
  const { data } = await supabase
    .from("teacher_classrooms")
    .select("classroom_id")
    .limit(1);
  return data && data.length > 0 ? "teacher" : "guardian";
}
