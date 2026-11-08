import Link from "next/link";
import { timeAgo } from "@/lib/format";

type Child = { id: string; display_name: string };
type Activity = Map<string, { count: number; last: string }>;

// Vista del docente: cada niño con cuántos momentos hubo en las últimas 24 h.
// Usa la hora actual: renderizar en un contexto dinámico.
export function ChildActivityList({
  kids,
  activity,
}: {
  kids: Child[];
  activity: Activity;
}) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {kids.map((c) => {
        const a = activity.get(c.id);
        return (
          <li key={c.id}>
            <Link
              href={`/dashboard/ninos/${c.id}`}
              className="block rounded-xl border border-border bg-white p-4 hover:bg-gray-50"
            >
              <p className="text-lg font-semibold">{c.display_name}</p>
              <p className="mt-1 text-sm text-muted">
                {a
                  ? `${a.count} ${a.count === 1 ? "momento" : "momentos"} en 24 h · último ${timeAgo(a.last)}`
                  : "Sin momentos en las últimas 24 h"}
              </p>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
