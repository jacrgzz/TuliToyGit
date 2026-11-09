import { notFound } from "next/navigation";
import { getViewerRole, requireUser } from "@/features/auth/queries";
import { listMyClassrooms } from "@/features/children/queries";

// Páginas propias del docente (Mi salón, Momentos, Bitácora): exigen sesión y rol docente
// (para un tutor o el admin responden 404) y devuelven el salón del docente.
export async function requireTeacherRoom() {
  await requireUser();
  if ((await getViewerRole()) !== "teacher") notFound();
  const rooms = await listMyClassrooms();
  return rooms[0] ?? null;
}
