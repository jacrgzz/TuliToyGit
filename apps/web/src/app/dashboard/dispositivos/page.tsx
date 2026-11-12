import { Suspense } from "react";
import { requireUser } from "@/features/auth/queries";
import { listMyChildren, listMyClassrooms } from "@/features/children/queries";
import { ToyStatus } from "@/features/devices/components/ToyStatus";
import { listToyStatus } from "@/features/devices/queries";
import { getLatestReading } from "@/features/readings/queries";
import { timeAgo } from "@/lib/format";

async function Devices() {
  await requireUser();
  const [kids, toys, rooms] = await Promise.all([listMyChildren(), listToyStatus(), listMyClassrooms()]);
  const readings = await Promise.all(rooms.map(async (r) => ({ room: r, reading: await getLatestReading(r.id) })));
  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Dispositivos</h1>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Cajas de sensores</h2>
        {readings.length === 0 ? (
          <p className="rounded-xl border border-border bg-white p-4 text-muted">No hay cajas visibles para tu cuenta.</p>
        ) : (
          <ul className="space-y-2">
            {readings.map(({ room, reading }) => (
              <li key={room.id} className="rounded-xl border border-border bg-white p-4">
                <p className="font-semibold">{room.name}</p>
                <p className="mt-1 text-sm text-muted">
                  {reading ? `Última lectura ${timeAgo(reading.measured_at)}` : "Todavía no ha enviado lecturas."}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Juguetes</h2>
        <p className="text-sm text-muted">
          El juguete solo envía datos cuando se usa, así que una última señal antigua no significa que esté descompuesto.
        </p>
        {kids.length === 0 ? (
          <p className="rounded-xl border border-border bg-white p-4 text-muted">No hay niños vinculados a tu cuenta.</p>
        ) : (
          <ul className="space-y-2">
            {kids.map((k) => (
              <li key={k.id} className="rounded-xl border border-border bg-white p-4">
                <p className="font-semibold">{k.display_name}</p>
                <ToyStatus toy={toys.get(k.id)} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default function DispositivosPage() {
  return (
    <Suspense fallback={<p className="text-muted">Cargando…</p>}>
      <Devices />
    </Suspense>
  );
}
