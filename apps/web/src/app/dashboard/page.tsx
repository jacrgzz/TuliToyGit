import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AdminPanel } from "@/features/admin/components/AdminPanel";
import { getViewerRole, requireUser } from "@/features/auth/queries";
import { ChildActivityList } from "@/features/children/components/ChildActivityList";
import { listMyChildren } from "@/features/children/queries";
import { LiveRefresh } from "@/features/events/components/LiveRefresh";
import { countRecentEventsByChild } from "@/features/events/queries";
import { ClassroomView } from "./_components/ClassroomView";

async function DashboardHome() {
  await requireUser();
  const role = await getViewerRole();

  // Superusuario de solo lectura: todo el sistema en un panel.
  if (role === "admin") {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Panel de administración</h1>
          <LiveRefresh />
        </div>
        <AdminPanel />
      </div>
    );
  }

  const children = await listMyChildren();

  if (children.length === 0) {
    return (
      <p className="rounded-xl border border-border bg-white p-4">
        Todavía no tienes niños vinculados a tu cuenta. Pide a quien administra
        Tuli que vincule tu cuenta.
      </p>
    );
  }

  // Tutor con un solo niño: directo a su panel.
  if (role === "guardian" && children.length === 1) {
    redirect(`/dashboard/ninos/${children[0].id}`);
  }

  if (role === "guardian") {
    return (
      <div>
        <h1 className="mb-4 text-2xl font-bold">Mis niños</h1>
        <ChildActivityList kids={children} activity={await countRecentEventsByChild()} />
      </div>
    );
  }

  // Docente: su salón (condiciones y actividad de cada niño).
  return <ClassroomView classroomId={children[0].classroom_id} title="Panel del salón" />;
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<p className="text-muted">Cargando…</p>}>
      <DashboardHome />
    </Suspense>
  );
}
