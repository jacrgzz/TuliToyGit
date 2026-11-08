import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getViewerRole, requireUser } from "@/features/auth/queries";
import { ChildActivityList } from "@/features/children/components/ChildActivityList";
import { listMyChildren } from "@/features/children/queries";
import { LiveRefresh } from "@/features/events/components/LiveRefresh";
import { countRecentEventsByChild } from "@/features/events/queries";
import { ConditionsPanel } from "@/features/readings/components/ConditionsPanel";
import { getLatestReading } from "@/features/readings/queries";

async function DashboardHome() {
  await requireUser();
  const [role, children] = await Promise.all([getViewerRole(), listMyChildren()]);

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

  // Docente: condiciones del salón y actividad de cada niño.
  const classroomId = children[0].classroom_id;
  const [reading, activity] = await Promise.all([
    getLatestReading(classroomId),
    countRecentEventsByChild(),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Panel del salón</h1>
        <LiveRefresh />
      </div>
      <section>
        <h2 className="mb-3 text-lg font-semibold">Condiciones del salón ahora</h2>
        <ConditionsPanel reading={reading} />
      </section>
      <section>
        <h2 className="mb-3 text-lg font-semibold">Niños del salón</h2>
        <ChildActivityList kids={children} activity={activity} />
      </section>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<p className="text-muted">Cargando…</p>}>
      <DashboardHome />
    </Suspense>
  );
}
