import { Suspense } from "react";
import { EventList } from "@/features/events/components/EventList";
import { listRecentEvents } from "@/features/events/queries";
import { PeriodSelector } from "@/features/insights/components/PeriodSelector";
import { parsePeriod } from "@/lib/period";
import { requireTeacherRoom, visibleChildren } from "../_components/room";

async function Moments({ searchParams }: { searchParams: PageProps<"/dashboard/momentos">["searchParams"] }) {
  const [, sp] = await Promise.all([requireTeacherRoom(), searchParams]);
  const days = parsePeriod(sp.dias, 7);
  const { kids } = await visibleChildren();
  const events = await listRecentEvents(days, 100, kids.map((k) => k.id));
  const names = new Map(kids.map((k) => [k.id, k.display_name]));
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Momentos</h1>
        <PeriodSelector current={days} basePath="/dashboard/momentos" />
      </div>
      <p className="text-sm text-muted">
        Cada momento es una pulsación del juguete de un niño del salón. Toca uno para ver las condiciones de los 5 minutos previos y agregar una nota.
      </p>
      <EventList events={events} childNames={names} />
    </div>
  );
}

export default function MomentosPage(props: PageProps<"/dashboard/momentos">) {
  return (
    <Suspense fallback={<p className="text-muted">Cargando…</p>}>
      <Moments searchParams={props.searchParams} />
    </Suspense>
  );
}
