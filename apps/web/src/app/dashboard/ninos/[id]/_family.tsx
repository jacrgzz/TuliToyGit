import Link from "next/link";
import { toyCare } from "@/features/devices/care";
import { listToyStatus } from "@/features/devices/queries";
import { EventList } from "@/features/events/components/EventList";
import { listEventSummaries } from "@/features/events/queries";
import { FamilyCards } from "@/features/insights/components/FamilyCards";
import { childToday, roomToday, TOY_IS_OK } from "@/features/insights/family";
import { getClassroomDailyStats, getDailyCounts } from "@/features/insights/queries";
import { ConditionsPanel } from "@/features/readings/components/ConditionsPanel";
import { getLatestReading } from "@/features/readings/queries";
import { timeAgo } from "@/lib/format";
import { KPI } from "@/lib/thresholds";
import { todayMx } from "@/lib/time-mx";

type Child = { id: string; display_name: string; classroom_id: string };

// "Hoy" de la familia: cómo le va a su hijo frente a lo habitual EN ÉL, cómo estuvo el salón y si su
// juguete funciona. Ver docs/vista-tutor.md.
export async function FamilyToday({ child }: { child: Child }) {
  const today = todayMx();
  const [daily, stats, toys, reading, recent] = await Promise.all([
    getDailyCounts(child.id, KPI.baselineDays + 7),
    getClassroomDailyStats(child.classroom_id, 2),
    listToyStatus(),
    getLatestReading(child.classroom_id),
    listEventSummaries(child.id, 5),
  ]);
  const toy = toys.get(child.id);
  const cards = [
    childToday(daily, today, child.display_name),
    roomToday(stats, today),
    toyCare(
      {
        ageMs: toy?.age_ms ?? null,
        batteryPct: toy?.battery_pct ?? null,
        lastSeen: toy?.last_seen_at ? timeAgo(toy.last_seen_at) : null,
      },
      KPI.coverageWindowMs,
    ),
  ];

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <FamilyCards cards={cards} label="Cómo va el día" />
        <p className="text-sm text-muted">{TOY_IS_OK}</p>
        <Link href={`/dashboard/ninos/${child.id}/semana`} className="text-sm font-medium text-brand hover:underline">
          Ver cómo le fue esta semana →
        </Link>
      </section>
      <section>
        <h2 className="mb-3 text-lg font-semibold">El salón en este momento</h2>
        <ConditionsPanel reading={reading} />
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
      <p className="text-xs text-muted">
        Tuli muestra coincidencias entre el ambiente del salón y los momentos en que usó su juguete. No es un dispositivo médico ni
        da diagnósticos.
      </p>
    </div>
  );
}
