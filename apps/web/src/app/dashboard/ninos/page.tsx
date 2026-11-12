import { Suspense } from "react";
import { requireUser } from "@/features/auth/queries";
import { ChildActivityList } from "@/features/children/components/ChildActivityList";
import { listMyChildren } from "@/features/children/queries";
import { ToyStatus } from "@/features/devices/components/ToyStatus";
import { listToyStatus } from "@/features/devices/queries";
import { countRecentEventsByChild } from "@/features/events/queries";

async function Kids() {
  await requireUser();
  const [kids, activity, toys] = await Promise.all([listMyChildren(), countRecentEventsByChild(), listToyStatus()]);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Niños</h1>
      {kids.length === 0 ? (
        <p className="rounded-xl border border-border bg-white p-4 text-muted">Todavía no hay niños vinculados a tu cuenta.</p>
      ) : (
        <ChildActivityList kids={kids} activity={activity} extra={(id) => <ToyStatus toy={toys.get(id)} />} />
      )}
    </div>
  );
}

export default function KidsPage() {
  return (
    <Suspense fallback={<p className="text-muted">Cargando…</p>}>
      <Kids />
    </Suspense>
  );
}
