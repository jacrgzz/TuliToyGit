import { ChildActivityList } from "@/features/children/components/ChildActivityList";
import { ToyStatus } from "@/features/devices/components/ToyStatus";
import { listToyStatus } from "@/features/devices/queries";
import { countRecentEventsByChild } from "@/features/events/queries";
import { childToday } from "@/features/insights/family";
import { getDailyCounts } from "@/features/insights/queries";
import { KPI } from "@/lib/thresholds";
import { todayMx } from "@/lib/time-mx";

type Kid = { id: string; display_name: string };

// Lista de "Mis niños" para la familia: cada niño con la frase de cómo le va hoy frente a lo
// habitual en él (nunca frente a sus hermanos) y el estado de su juguete.
export async function FamilyKids({ kids }: { kids: Kid[] }) {
  const today = todayMx();
  const [activity, toys, daily] = await Promise.all([
    countRecentEventsByChild(),
    listToyStatus(),
    Promise.all(kids.map((k) => getDailyCounts(k.id, KPI.baselineDays + 7))),
  ]);
  const todayById = new Map(kids.map((k, i) => [k.id, childToday(daily[i], today, k.display_name)]));
  return (
    <ChildActivityList
      kids={kids}
      activity={activity}
      extra={(id) => {
        const t = todayById.get(id);
        return (
          <>
            {t && (
              <p className="mt-2 text-sm">
                {t.value ? `Hoy: ${t.value}. ` : ""}
                {t.sentence}
              </p>
            )}
            <ToyStatus toy={toys.get(id)} />
          </>
        );
      }}
    />
  );
}
