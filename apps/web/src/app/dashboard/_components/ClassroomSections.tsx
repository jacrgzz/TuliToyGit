import { ActivityLog } from "@/features/activities/components/ActivityLog";
import { listActivities } from "@/features/activities/queries";
import { ToyStatus } from "@/features/devices/components/ToyStatus";
import { listToyStatus } from "@/features/devices/queries";
import { ChildActivityList } from "@/features/children/components/ChildActivityList";
import { listClassroomChildren } from "@/features/children/queries";
import { countRecentEventsByChild } from "@/features/events/queries";
import { liveNoiseMessage, noiseSensitiveNames, notableNames } from "@/features/insights/alerts";
import { DaySelector } from "@/features/insights/components/DaySelector";
import { DayTimelineChart } from "@/features/insights/components/DayTimelineChart";
import { HourHeatmap } from "@/features/insights/components/HourHeatmap";
import { KpiCards } from "@/features/insights/components/KpiCards";
import { LiveNoiseAlert } from "@/features/insights/components/LiveNoiseAlert";
import { PeriodSelector } from "@/features/insights/components/PeriodSelector";
import { ProfilesTable } from "@/features/insights/components/ProfilesTable";
import { RedTimeChart } from "@/features/insights/components/RedTimeChart";
import { WeekSummary } from "@/features/insights/components/WeekSummary";
import { coverageKpi, todayKpis, weekSentences, weekSummary } from "@/features/insights/kpis";
import { noisiestHourSummary } from "@/features/insights/patterns";
import { getClassroomDailyRed, getClassroomDailyStats, getClassroomDay, getClassroomNoiseHeatmap, getClassroomProfiles, getLiveNoise } from "@/features/insights/queries";
import { ConditionsPanel } from "@/features/readings/components/ConditionsPanel";
import { getLatestReading } from "@/features/readings/queries";
import type { Period } from "@/lib/period";
import { ageMs } from "@/lib/format";
import { todayMx } from "@/lib/time-mx";
import { PATTERNS } from "@/lib/thresholds";

// Secciones de la vista de un salón. Se componen aquí, en la capa de app, porque juntan varias
// features. Cada una pide sus datos y debe renderizarse en un contexto dinámico (dentro de Suspense).
// Las usan ClassroomView (admin, todo junto) y las páginas del docente (una por sección).

export async function LiveSection({ classroomId, days }: { classroomId: string; days: Period }) {
  const [reading, profiles, live] = await Promise.all([
    getLatestReading(classroomId),
    getClassroomProfiles(classroomId, days),
    getLiveNoise(classroomId),
  ]);
  return (
    <>
      <LiveNoiseAlert message={liveNoiseMessage(live, noiseSensitiveNames(profiles))} />
      <section>
        <h2 className="mb-3 text-lg font-semibold">Condiciones del salón ahora</h2>
        <ConditionsPanel reading={reading} />
      </section>
    </>
  );
}

// Indicadores de "Hoy": K1 a K4 salen de una sola consulta SQL y K5 (cobertura) del estado de los juguetes.
export async function KpiSection({ classroomId }: { classroomId: string }) {
  const [stats, kids, toys, reading] = await Promise.all([
    getClassroomDailyStats(classroomId),
    listClassroomChildren(classroomId),
    listToyStatus(),
    getLatestReading(classroomId),
  ]);
  const kpis = [
    ...todayKpis(stats, todayMx()),
    coverageKpi(
      kids.map((c) => toys.get(c.id)?.age_ms ?? null),
      reading ? ageMs(reading.measured_at) : null,
    ),
  ];
  return <KpiCards kpis={kpis} />;
}

// Resumen de la semana: lunes a hoy frente al mismo tramo de la semana anterior.
export async function WeekSection({ classroomId }: { classroomId: string }) {
  const [stats, heat, profiles] = await Promise.all([
    getClassroomDailyStats(classroomId),
    getClassroomNoiseHeatmap(classroomId, 7),
    getClassroomProfiles(classroomId, 30),
  ]);
  const week = weekSummary(stats, todayMx());
  return (
    <WeekSummary
      sentences={weekSentences(week)}
      noisiestHour={week.daysWithData > 0 ? noisiestHourSummary(heat) : null}
      notable={notableNames(profiles)}
    />
  );
}

export async function ProfilesSection({ classroomId, days, basePath }: { classroomId: string; days: Period; basePath: string }) {
  const profiles = await getClassroomProfiles(classroomId, days);
  return (
    <section>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Perfiles del salón</h2>
          <p className="text-sm text-muted">Qué condición acompaña más a los momentos de cada niño. Son coincidencias, no causas.</p>
        </div>
        <PeriodSelector current={days} basePath={basePath} />
      </div>
      <ProfilesTable profiles={profiles} />
    </section>
  );
}

export async function DaySection({ classroomId, days, day, basePath }: { classroomId: string; days: Period; day: string | null; basePath: string }) {
  const [dayData, activities] = await Promise.all([getClassroomDay(classroomId, day), listActivities(classroomId, 14)]);
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Un día en el salón</h2>
        {dayData && <DaySelector day={dayData.day} days={days} basePath={basePath} />}
      </div>
      <div className="card">
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
  );
}

export async function LogSection({ classroomId, canEdit }: { classroomId: string; canEdit: boolean }) {
  const activities = await listActivities(classroomId, 14);
  return (
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
  );
}

export async function NoiseSection({ classroomId, days }: { classroomId: string; days: Period }) {
  const [noiseHeat, red] = await Promise.all([getClassroomNoiseHeatmap(classroomId, days), getClassroomDailyRed(classroomId, days)]);
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">Ruido del salón</h2>
      <div className="card">
        <h3 className="mb-1 font-semibold">Cuándo es más ruidoso</h3>
        <p className="mb-3 text-sm">{noisiestHourSummary(noiseHeat)}</p>
        <HourHeatmap
          cells={noiseHeat.map((c) => ({ dow: c.dow, hour: c.hour, value: c.high_pct ?? 0 }))}
          unit={`% de lecturas con pico ≥ ${PATTERNS.noiseHigh} dB`}
          format={(n) => `${Math.round(n)}`}
          caption="Porcentaje de lecturas con pico de ruido alto por día de la semana y hora"
        />
      </div>
      <div className="card">
        <h3 className="mb-3 font-semibold">Tiempo en zona roja por día</h3>
        <RedTimeChart rows={red} threshold={PATTERNS.noiseHigh} />
      </div>
    </section>
  );
}

export async function KidsSection({ classroomId, heading = "Niños del salón" }: { classroomId: string; heading?: string | null }) {
  const [children, activity, toys] = await Promise.all([listClassroomChildren(classroomId), countRecentEventsByChild(), listToyStatus()]);
  return (
    <section>
      {heading && <h2 className="mb-3 text-lg font-semibold">{heading}</h2>}
      {children.length === 0 ? (
        <p className="card text-muted">Este salón no tiene niños.</p>
      ) : (
        <ChildActivityList kids={children} activity={activity} extra={(id) => <ToyStatus toy={toys.get(id)} />} />
      )}
    </section>
  );
}
