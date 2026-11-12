import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { getViewerRole, requireUser } from "@/features/auth/queries";
import { listMyChildren, listMyClassrooms } from "@/features/children/queries";

// Salón elegido por el docente cuando tiene varios. Se guarda en una cookie (no en la URL) para que
// persista entre secciones. El valor solo se acepta si está entre los salones que RLS deja ver.
export const ROOM_COOKIE = "tuli_salon";

// Lee cookies: usar dentro de <Suspense>.
export async function getSelectedRoom() {
  const rooms = await listMyClassrooms();
  const saved = (await cookies()).get(ROOM_COOKIE)?.value;
  const selected = rooms.find((r) => r.id === saved) ?? rooms[0] ?? null;
  return { rooms, selected };
}

// Páginas propias del docente (Mi salón, Bitácora): exigen sesión y rol docente
// (para un tutor o el admin responden 404) y devuelven el salón elegido del docente.
export async function requireTeacherRoom() {
  await requireUser();
  if ((await getViewerRole()) !== "teacher") notFound();
  return (await getSelectedRoom()).selected;
}

// Niños que muestra cada sección. El docente ve solo los del salón elegido; el tutor y el admin, lo que
// RLS les da (el admin ve todos los salones, por eso no se filtra).
export async function visibleChildren() {
  const [role, kids] = await Promise.all([getViewerRole(), listMyChildren()]);
  if (role !== "teacher") return { role, kids, room: null };
  const { selected } = await getSelectedRoom();
  return { role, kids: kids.filter((k) => k.classroom_id === selected?.id), room: selected };
}
