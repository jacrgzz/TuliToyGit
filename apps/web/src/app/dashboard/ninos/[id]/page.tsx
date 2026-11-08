import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getViewerRole, requireUser } from "@/features/auth/queries";
import { getChild } from "@/features/children/queries";
import { LiveRefresh } from "@/features/events/components/LiveRefresh";
import { EventList } from "@/features/events/components/EventList";
import { listEventSummaries } from "@/features/events/queries";
import { PatternsCard } from "@/features/insights/components/PatternsCard";
import { getChildPatterns } from "@/features/insights/queries";
import { ConditionsPanel } from "@/features/readings/components/ConditionsPanel";
import { getLatestReading } from "@/features/readings/queries";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function ChildView({ params }: { params: PageProps<"/dashboard/ninos/[id]">["params"] }) {
  await requireUser();
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  // Si el usuario no puede ver al niño, RLS devuelve null → 404 (no se revela que existe).
  const child = await getChild(id);
  if (!child) notFound();

  const [role, reading, events, patterns] = await Promise.all([
    getViewerRole(),
    getLatestReading(child.classroom_id),
    listEventSummaries(child.id),
    getChildPatterns(child.id),
  ]);

  return (
    <div className="space-y-8">
      <div>
        {role === "teacher" && (
          <Link href="/dashboard" className="text-sm text-muted hover:underline">
            ← Volver al salón
          </Link>
        )}
        <div className="mt-1 flex items-center justify-between">
          <h1 className="text-2xl font-bold">{child.display_name}</h1>
          <LiveRefresh />
        </div>
      </div>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Condiciones del salón ahora</h2>
        <ConditionsPanel reading={reading} />
      </section>

      <PatternsCard patterns={patterns} />

      <section>
        <h2 className="mb-3 text-lg font-semibold">Momentos recientes</h2>
        <EventList events={events} />
      </section>
    </div>
  );
}

export default function ChildPage(props: PageProps<"/dashboard/ninos/[id]">) {
  return (
    <Suspense fallback={<p className="text-muted">Cargando…</p>}>
      <ChildView params={props.params} />
    </Suspense>
  );
}
