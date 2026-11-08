import Link from "next/link";
import { conditionTitle, EVIDENCE_LABEL, evidenceFor, formatLift } from "../evidence";
import type { ClassroomProfile } from "../queries";

// B4: la vista de un vistazo del docente. Cada niño con su condición más asociada,
// el nivel de evidencia y la tendencia (últimos 7 días frente a los 7 anteriores).

function Trend({ last, prev }: { last: number; prev: number }) {
  const diff = last - prev;
  const text = diff === 0 ? "Igual" : diff > 0 ? `Más (+${diff})` : `Menos (${diff})`;
  return (
    <span>
      {prev} → {last} <span className="text-muted">· {text}</span>
    </span>
  );
}

export function ProfilesTable({ profiles }: { profiles: ClassroomProfile[] }) {
  if (profiles.length === 0) {
    return <p className="rounded-xl border border-border bg-white p-4 text-muted">Este salón no tiene niños.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-white">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-border text-muted">
          <tr>
            <th className="px-3 py-2 font-medium">Niño</th>
            <th className="px-3 py-2 font-medium">Momentos</th>
            <th className="px-3 py-2 font-medium">7 días previos → últimos 7</th>
            <th className="px-3 py-2 font-medium">Condición que más coincide</th>
            <th className="px-3 py-2 font-medium">Evidencia</th>
          </tr>
        </thead>
        <tbody>
          {profiles.map((p) => {
            const has = p.top_condition !== null;
            const evidence = has
              ? evidenceFor({
                  condition: p.top_condition!,
                  events_total: Number(p.top_events_total),
                  events_with: Number(p.top_events_with),
                  event_pct: p.top_event_pct,
                  baseline_pct: p.top_baseline_pct,
                  lift: p.top_lift,
                  wilson_low: p.top_wilson_low,
                })
              : null;
            return (
              <tr key={p.child_id} className="border-b border-border last:border-0">
                <td className="px-3 py-2">
                  <Link href={`/dashboard/ninos/${p.child_id}`} className="font-medium text-brand hover:underline">
                    {p.display_name}
                  </Link>
                </td>
                <td className="px-3 py-2">{Number(p.events_period)}</td>
                <td className="px-3 py-2">
                  <Trend last={Number(p.events_last7)} prev={Number(p.events_prev7)} />
                </td>
                <td className="px-3 py-2">
                  {has ? (
                    <>
                      {conditionTitle(p.top_condition!)}{" "}
                      <span className="text-muted">
                        · {formatLift(Number(p.top_lift))} ({Math.round(Number(p.top_event_pct))} % vs{" "}
                        {Math.round(Number(p.top_baseline_pct))} %)
                      </span>
                    </>
                  ) : (
                    <span className="text-muted">Sin coincidencia clara todavía</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  {evidence ? EVIDENCE_LABEL[evidence] : <span className="text-muted">—</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
