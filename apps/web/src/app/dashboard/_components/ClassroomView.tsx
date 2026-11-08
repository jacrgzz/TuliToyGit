import { ChildActivityList } from "@/features/children/components/ChildActivityList";
import { listClassroomChildren } from "@/features/children/queries";
import { LiveRefresh } from "@/features/events/components/LiveRefresh";
import { countRecentEventsByChild } from "@/features/events/queries";
import { PeriodSelector } from "@/features/insights/components/PeriodSelector";
import { ProfilesTable } from "@/features/insights/components/ProfilesTable";
import { getClassroomProfiles } from "@/features/insights/queries";
import { ConditionsPanel } from "@/features/readings/components/ConditionsPanel";
import { getLatestReading } from "@/features/readings/queries";
import type { Period } from "@/lib/period";

// Vista de un salón (docente y admin). Se compone aquí, en la capa de app, porque junta
// varias features. Debe renderse en un contexto dinámico.
export async function ClassroomView({
  classroomId,
  title,
  days,
  basePath,
}: {
  classroomId: string;
  title: string;
  days: Period;
  basePath: string;
}) {
  const [children, reading, activity, profiles] = await Promise.all([
    listClassroomChildren(classroomId),
    getLatestReading(classroomId),
    countRecentEventsByChild(),
    getClassroomProfiles(classroomId, days),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{title}</h1>
        <LiveRefresh />
      </div>
      <section>
        <h2 className="mb-3 text-lg font-semibold">Condiciones del salón ahora</h2>
        <ConditionsPanel reading={reading} />
      </section>
      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Perfiles del salón</h2>
            <p className="text-sm text-muted">
              Qué condición acompaña más a los momentos de cada niño. Son coincidencias, no causas.
            </p>
          </div>
          <PeriodSelector current={days} basePath={basePath} />
        </div>
        <ProfilesTable profiles={profiles} />
      </section>
      <section>
        <h2 className="mb-3 text-lg font-semibold">Niños del salón</h2>
        {children.length === 0 ? (
          <p className="rounded-xl border border-border bg-white p-4 text-muted">
            Este salón no tiene niños.
          </p>
        ) : (
          <ChildActivityList kids={children} activity={activity} />
        )}
      </section>
    </div>
  );
}
