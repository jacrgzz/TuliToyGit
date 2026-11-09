import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getViewerRole, requireUser } from "@/features/auth/queries";
import { getClassroom } from "@/features/children/queries";
import { parseDay, parsePeriod } from "@/lib/period";
import { ClassroomView } from "../../_components/ClassroomView";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Props = PageProps<"/dashboard/salones/[id]">;

async function RoomPage({ params, searchParams }: { params: Props["params"]; searchParams: Props["searchParams"] }) {
  await requireUser();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const days = parsePeriod(sp.dias);
  const day = parseDay(sp.dia);
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
      <ClassroomView classroomId={room.id} title={room.name} days={days} day={day} basePath={`/dashboard/salones/${room.id}`} />
    </div>
  );
}

export default function SalonPage(props: Props) {
  return (
    <Suspense fallback={<p className="text-muted">Cargando…</p>}>
      <RoomPage params={props.params} searchParams={props.searchParams} />
    </Suspense>
  );
}
