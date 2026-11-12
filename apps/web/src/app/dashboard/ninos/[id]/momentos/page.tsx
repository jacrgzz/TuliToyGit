import { Suspense } from "react";
import { EventList } from "@/features/events/components/EventList";
import { listEventSummaries } from "@/features/events/queries";
import { loadChild } from "../_lib";

type Props = PageProps<"/dashboard/ninos/[id]/momentos">;

async function Moments({ params }: { params: Props["params"] }) {
  const child = await loadChild(params);
  const events = await listEventSummaries(child.id, 50);
  return (
    <section>
      <h2 className="mb-1 text-lg font-semibold">Momentos recientes</h2>
      <p className="mb-3 text-sm text-muted">Cada momento es una pulsación del juguete. Toca uno para ver las condiciones de los 5 minutos previos.</p>
      <EventList events={events} />
    </section>
  );
}

export default function MomentosPage(props: Props) {
  return (
    <Suspense fallback={<p className="text-muted">Cargando…</p>}>
      <Moments params={props.params} />
    </Suspense>
  );
}
