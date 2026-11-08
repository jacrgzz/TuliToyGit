import { ChildActivityList } from "@/features/children/components/ChildActivityList";
import { listClassroomChildren } from "@/features/children/queries";
import { LiveRefresh } from "@/features/events/components/LiveRefresh";
import { countRecentEventsByChild } from "@/features/events/queries";
import { ConditionsPanel } from "@/features/readings/components/ConditionsPanel";
import { getLatestReading } from "@/features/readings/queries";

// Vista de un salón (docente y admin). Se compone aquí, en la capa de app, porque junta
// varias features. Debe renderse en un contexto dinámico.
export async function ClassroomView({ classroomId, title }: { classroomId: string; title: string }) {
  const [children, reading, activity] = await Promise.all([
    listClassroomChildren(classroomId),
    getLatestReading(classroomId),
    countRecentEventsByChild(),
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
