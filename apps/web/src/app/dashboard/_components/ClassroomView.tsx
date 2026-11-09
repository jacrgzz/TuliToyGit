import { ActivityLog } from "@/features/activities/components/ActivityLog";
import { listActivities } from "@/features/activities/queries";
import { ChildActivityList } from "@/features/children/components/ChildActivityList";
import { listClassroomChildren } from "@/features/children/queries";
import { LiveRefresh } from "@/features/events/components/LiveRefresh";
import { countRecentEventsByChild } from "@/features/events/queries";
import { DaySelector } from "@/features/insights/components/DaySelector";
import { DayTimelineChart } from "@/features/insights/components/DayTimelineChart";
import { HourHeatmap } from "@/features/insights/components/HourHeatmap";
import { PeriodSelector } from "@/features/insights/components/PeriodSelector";
import { ProfilesTable } from "@/features/insights/components/ProfilesTable";
import { RedTimeChart } from "@/features/insights/components/RedTimeChart";
import { noisiestHourSummary } from "@/features/insights/patterns";
import { getClassroomDailyRed, getClassroomDay, getClassroomNoiseHeatmap, getClassroomProfiles } from "@/features/insights/queries";
import { ConditionsPanel } from "@/features/readings/components/ConditionsPanel";
import { getLatestReading } from "@/features/readings/queries";
import type { Period } from "@/lib/period";
import { PATTERNS } from "@/lib/thresholds";

// Vista de un salón (docente y admin). Se compone aquí, en la capa de app, porque junta
// varias features. Debe renderse en un contexto dinámico.
export async function ClassroomView({
  classroomId,
  title,
  days,
  day,
  basePath,
  canEdit,
}: {
  classroomId: string;
  title: string;
  canEdit: boolean;
  days: Period;
  day: string | null;
  basePath: string;
}) {
  const [children, reading, activity, profiles, noiseHeat, red, dayData, activities] = await Promise.all([
    listClassroomChildren(classroomId),
    getLatestReading(classroomId),
    countRecentEventsByChild(),
    getClassroomProfiles(classroomId, days),
    getClassroomNoiseHeatmap(classroomId, days),
    getClassroomDailyRed(classroomId, days),
    getClassroomDay(classroomId, day),
    listActivities(classroomId, 14),
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
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Un día en el salón</h2>
          {dayData && <DaySelector day={dayData.day} days={days} basePath={basePath} />}
        </div>
        <div className="rounded-xl border border-border bg-white p-4">
          {dayData ? (
            <>
              <p className="mb-3 text-sm text-muted">
                Ruido del salón durante el día y los momentos de todos los niños, para ver qué pasó en cada uno.
              </p>
              <DayTimelineChart
                points={dayData.timeline}
                events={dayData.events}
                activities={activities.map((a) => ({ id: a.id, name: a.name, start: new Date(a.starts_at).getTime(), end: new Date(a.ends_at).getTime() }))}
              />
            </>
          ) : (
            <p className="text-muted">Este salón todavía no tiene lecturas.</p>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold">Bitácora de actividades</h2>
          <p className="text-sm text-muted">
            Marca exámenes, recreo, música u otros bloques del día. Aparecen en la línea del día y, en cada niño,
            se compara si sus momentos coinciden con alguna actividad.
          </p>
        </div>
        <ActivityLog classroomId={classroomId} activities={activities} canEdit={canEdit} />
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Ruido del salón</h2>
        <div className="rounded-xl border border-border bg-white p-4">
          <h3 className="mb-1 font-semibold">Cuándo es más ruidoso</h3>
          <p className="mb-3 text-sm">{noisiestHourSummary(noiseHeat)}</p>
          <HourHeatmap
            cells={noiseHeat.map((c) => ({ dow: c.dow, hour: c.hour, value: c.high_pct ?? 0 }))}
            unit={`% de lecturas con pico ≥ ${PATTERNS.noiseHigh} dB`}
            format={(n) => `${Math.round(n)}`}
            caption="Porcentaje de lecturas con pico de ruido alto por día de la semana y hora"
          />
        </div>
        <div className="rounded-xl border border-border bg-white p-4">
          <h3 className="mb-3 font-semibold">Tiempo en zona roja por día</h3>
          <RedTimeChart rows={red} threshold={PATTERNS.noiseHigh} />
        </div>
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
