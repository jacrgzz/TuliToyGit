import { Suspense } from "react";
import { getViewerRole } from "@/features/auth/queries";
import { Interventions } from "@/features/interventions/components/Interventions";
import { interventionSummary } from "@/features/interventions/compare";
import { compareIntervention, listInterventions } from "@/features/interventions/queries";
import { loadChild } from "../_lib";

type Props = PageProps<"/dashboard/ninos/[id]/ajustes">;

async function Adjustments({ params }: { params: Props["params"] }) {
  const child = await loadChild(params);
  const [role, interventions] = await Promise.all([getViewerRole(), listInterventions(child.id)]);
  const compared = await Promise.all(
    interventions.map(async (i) => ({ ...i, summary: interventionSummary(await compareIntervention(child.id, i.started_on)) })),
  );
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold">Ajustes y cambios</h2>
        <p className="text-sm text-muted">Compara los momentos de los días anteriores y posteriores a un cambio.</p>
      </div>
      <Interventions childId={child.id} items={compared} canEdit={role === "teacher"} />
    </section>
  );
}

export default function AjustesPage(props: Props) {
  return (
    <Suspense fallback={<p className="text-muted">Cargando…</p>}>
      <Adjustments params={props.params} />
    </Suspense>
  );
}
