import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getViewerRole, requireUser } from "@/features/auth/queries";
import { getClassroom } from "@/features/children/queries";
import { ClassroomView } from "../../_components/ClassroomView";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function RoomPage({ params }: { params: PageProps<"/dashboard/salones/[id]">["params"] }) {
  await requireUser();
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  // Solo docentes del salón y admin: para un tutor RLS devuelve null si no tiene niños ahí.
  const [role, room] = await Promise.all([getViewerRole(), getClassroom(id)]);
  if (!room || role === "guardian") notFound();

  return (
    <div className="space-y-4">
      {role === "admin" && (
        <Link href="/dashboard" className="text-sm text-muted hover:underline">
          ← Volver al panel de admin
        </Link>
      )}
      <ClassroomView classroomId={room.id} title={room.name} />
    </div>
  );
}

export default function SalonPage(props: PageProps<"/dashboard/salones/[id]">) {
  return (
    <Suspense fallback={<p className="text-muted">Cargando…</p>}>
      <RoomPage params={props.params} />
    </Suspense>
  );
}
