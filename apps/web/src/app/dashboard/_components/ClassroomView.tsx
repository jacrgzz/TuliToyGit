import { LiveRefresh } from "@/features/events/components/LiveRefresh";
import type { Period } from "@/lib/period";
import { DaySection, KidsSection, LiveSection, LogSection, NoiseSection, ProfilesSection } from "./ClassroomSections";

// Vista completa de un salón (admin, en /dashboard/salones/[id]): todas las secciones juntas.
// El docente las ve repartidas en las páginas de la barra lateral.
export function ClassroomView({
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
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{title}</h1>
        <LiveRefresh />
      </div>
      <LiveSection classroomId={classroomId} days={days} />
      <ProfilesSection classroomId={classroomId} days={days} basePath={basePath} />
      <DaySection classroomId={classroomId} days={days} day={day} basePath={basePath} />
      <LogSection classroomId={classroomId} canEdit={canEdit} />
      <NoiseSection classroomId={classroomId} days={days} />
      <KidsSection classroomId={classroomId} />
    </div>
  );
}
