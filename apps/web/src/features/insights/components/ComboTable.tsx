import { comboTitle } from "../combo";
import { EVIDENCE_LABEL, effectiveLift, evidenceFor, formatLift } from "../evidence";
import type { ConditionComboRow } from "../queries";

// A8: tabla 2 × 2 (ruido alto × cambio brusco de luz): qué porcentaje de sus momentos cae en cada
// caso frente al porcentaje del tiempo del salón. Los valores van en texto.
export function ComboTable({ rows }: { rows: ConditionComboRow[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-border text-muted">
          <tr>
            <th className="px-3 py-2 font-medium">Antes de su momento hubo…</th>
            <th className="px-3 py-2 font-medium">Sus momentos</th>
            <th className="px-3 py-2 font-medium">Tiempo del salón</th>
            <th className="px-3 py-2 font-medium">Razón</th>
            <th className="px-3 py-2 font-medium">Evidencia</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const ev = evidenceFor(r);
            const lift = effectiveLift(r);
            return (
              <tr key={r.condition} className="border-b border-border last:border-0">
                <td className="px-3 py-2 font-medium">{comboTitle(r.condition)}</td>
                <td className="px-3 py-2">
                  {Math.round(Number(r.event_pct ?? 0))} % ({r.events_with}/{r.events_total})
                </td>
                <td className="px-3 py-2">{Math.round(Number(r.baseline_pct ?? 0))} %</td>
                <td className="px-3 py-2">{lift > 0 && ev !== "insuficiente" ? formatLift(lift) : "—"}</td>
                <td className="px-3 py-2 text-muted">{EVIDENCE_LABEL[ev]}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
