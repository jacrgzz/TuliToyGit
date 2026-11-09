import { Suspense } from "react";
import { LogSection } from "../_components/ClassroomSections";
import { requireTeacherRoom } from "../_components/room";

async function Log() {
  const room = await requireTeacherRoom();
  if (!room) return <p className="rounded-xl border border-border bg-white p-4">Todavía no tienes un salón vinculado a tu cuenta.</p>;
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Bitácora</h1>
      <LogSection classroomId={room.id} canEdit />
    </div>
  );
}

export default function BitacoraPage() {
  return (
    <Suspense fallback={<p className="text-muted">Cargando…</p>}>
      <Log />
    </Suspense>
  );
}
