import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AdminPanel } from "@/features/admin/components/AdminPanel";
import { getViewerRole, requireUser } from "@/features/auth/queries";
import { ToyStatus } from "@/features/devices/components/ToyStatus";
import { listToyStatus } from "@/features/devices/queries";
import { ChildActivityList } from "@/features/children/components/ChildActivityList";
import { listMyChildren } from "@/features/children/queries";
import { LiveRefresh } from "@/features/events/components/LiveRefresh";
import { countRecentEventsByChild } from "@/features/events/queries";
import { parseDay, parsePeriod } from "@/lib/period";
import { DaySection, KidsSection, LiveSection } from "./_components/ClassroomSections";

async function DashboardHome({ searchParams }: { searchParams: PageProps<"/dashboard">["searchParams"] }) {
  await requireUser();
  const sp = await searchParams;
  const days = parsePeriod(sp.dias);
  const day = parseDay(sp.dia);
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

  const [children, toys] = await Promise.all([listMyChildren(), listToyStatus()]);

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
    redirect(`/dashboard/ninos/${children[0].id}/resumen`);
  }

  if (role === "guardian") {
    return (
      <div>
        <h1 className="mb-4 text-2xl font-bold">Mis niños</h1>
        <ChildActivityList
          kids={children}
          activity={await countRecentEventsByChild()}
          extra={(id) => <ToyStatus toy={toys.get(id)} />}
        />
      </div>
    );
  }

  // Docente: "Hoy" = aviso en vivo, condiciones, un día en el salón y sus niños.
  // El resto del salón está en las demás secciones de la barra lateral.
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Hoy</h1>
        <LiveRefresh />
      </div>
      <LiveSection classroomId={children[0].classroom_id} days={days} />
      <DaySection classroomId={children[0].classroom_id} days={days} day={day} basePath="/dashboard" />
      <KidsSection classroomId={children[0].classroom_id} />
    </div>
  );
}

export default function DashboardPage(props: PageProps<"/dashboard">) {
  return (
    <Suspense fallback={<p className="text-muted">Cargando…</p>}>
      <DashboardHome searchParams={props.searchParams} />
    </Suspense>
  );
}
