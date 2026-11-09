import Link from "next/link";
import { Suspense } from "react";
import { listEventSummaries } from "@/features/events/queries";
import { EventList } from "@/features/events/components/EventList";
import { PeriodSelector } from "@/features/insights/components/PeriodSelector";
import { ProfileSummary } from "@/features/insights/components/ProfileSummary";
import { getConditionLift } from "@/features/insights/queries";
import { ConditionsPanel } from "@/features/readings/components/ConditionsPanel";
import { getLatestReading } from "@/features/readings/queries";
import { parsePeriod } from "@/lib/period";
import { loadChild } from "../_lib";

type Props = PageProps<"/dashboard/ninos/[id]/resumen">;

async function Summary({ params, searchParams }: { params: Props["params"]; searchParams: Props["searchParams"] }) {
  const [child, sp] = await Promise.all([loadChild(params), searchParams]);
  const days = parsePeriod(sp.dias);
  const [reading, lift, recent] = await Promise.all([
    getLatestReading(child.classroom_id),
    getConditionLift(child.id, days),
    listEventSummaries(child.id, 5),
  ]);

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-3 text-lg font-semibold">Condiciones del salón ahora</h2>
        <ConditionsPanel reading={reading} />
      </section>
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Lo que más coincide</h2>
          <PeriodSelector current={days} basePath={`/dashboard/ninos/${child.id}/resumen`} />
        </div>
        <ProfileSummary rows={lift} days={days} />
        <Link href={`/dashboard/ninos/${child.id}/perfil?dias=${days}`} className="text-sm font-medium text-brand hover:underline">
          Ver el perfil de sensibilidad completo →
        </Link>
      </section>
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Últimos momentos</h2>
          <Link href={`/dashboard/ninos/${child.id}/momentos`} className="text-sm font-medium text-brand hover:underline">
            Ver todos →
          </Link>
        </div>
        <EventList events={recent} />
      </section>
    </div>
  );
}

export default function ResumenPage(props: Props) {
  return (
    <Suspense fallback={<p className="text-muted">Cargando…</p>}>
      <Summary params={props.params} searchParams={props.searchParams} />
    </Suspense>
  );
}
