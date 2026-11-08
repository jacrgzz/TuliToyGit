import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getViewerRole, requireUser } from "@/features/auth/queries";
import { getChild } from "@/features/children/queries";
import { LiveRefresh } from "@/features/events/components/LiveRefresh";
import { EventList } from "@/features/events/components/EventList";
import { listEventSummaries } from "@/features/events/queries";
import { EventCurveChart } from "@/features/insights/components/EventCurveChart";
import { PeriodSelector } from "@/features/insights/components/PeriodSelector";
import { ProfileSummary } from "@/features/insights/components/ProfileSummary";
import { SensitivityBars } from "@/features/insights/components/SensitivityBars";
import { getConditionLift, getEventCurve } from "@/features/insights/queries";
import { ConditionsPanel } from "@/features/readings/components/ConditionsPanel";
import { getLatestReading } from "@/features/readings/queries";
import { parsePeriod } from "@/lib/period";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Props = PageProps<"/dashboard/ninos/[id]">;

async function ChildView({ params, searchParams }: { params: Props["params"]; searchParams: Props["searchParams"] }) {
  await requireUser();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  if (!UUID.test(id)) notFound();
  const days = parsePeriod(sp.dias);

  // Si el usuario no puede ver al niño, RLS devuelve null → 404 (no se revela que existe).
  const child = await getChild(id);
  if (!child) notFound();

  const [role, reading, events, lift, curve] = await Promise.all([
    getViewerRole(),
    getLatestReading(child.classroom_id),
    listEventSummaries(child.id),
    getConditionLift(child.id, days),
    getEventCurve(child.id, days),
  ]);

  return (
    <div className="space-y-8">
      <div>
        {role !== "guardian" && (
          <Link href="/dashboard" className="text-sm text-muted hover:underline">
            ← Volver al panel
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

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Perfil de sensibilidad</h2>
          <PeriodSelector current={days} basePath={`/dashboard/ninos/${child.id}`} />
        </div>
        <ProfileSummary rows={lift} days={days} />
        <div className="rounded-xl border border-border bg-white p-4">
          <h3 className="mb-3 font-semibold">Qué condiciones acompañan sus momentos</h3>
          <SensitivityBars rows={lift} />
        </div>
        <div className="rounded-xl border border-border bg-white p-4">
          <h3 className="mb-1 font-semibold">Ruido antes y después de sus momentos</h3>
          {curve.length > 0 ? (
            <EventCurveChart points={curve} />
          ) : (
            <p className="text-muted">Todavía no hay momentos con lecturas de la caja en este periodo.</p>
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Momentos recientes</h2>
        <EventList events={events} />
      </section>
    </div>
  );
}

export default function ChildPage(props: Props) {
  return (
    <Suspense fallback={<p className="text-muted">Cargando…</p>}>
      <ChildView params={props.params} searchParams={props.searchParams} />
    </Suspense>
  );
}
