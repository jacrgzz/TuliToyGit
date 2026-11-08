import { conditionTitle, EVIDENCE_LABEL, effectiveLift, evidenceFor, formatLift, type Evidence } from "../evidence";
import type { ConditionLiftRow } from "../queries";

// A1 + A2: barras horizontales sobre una escala común de 0 a 100 % (Cleveland y McGill):
// "antes de sus momentos" frente a "resto del tiempo", con el intervalo de Wilson al 95 %.
// Valores visibles en texto: la información nunca depende solo del color ni del hover.

const EVIDENCE_CLASS: Record<Evidence, string> = {
  alta: "border-foreground bg-foreground text-white",
  media: "border-foreground/60 text-foreground",
  sin_coincidencia: "border-border text-muted",
  insuficiente: "border-border text-muted",
};

const pct = (n: number | null) => Math.max(0, Math.min(100, Number(n ?? 0)));

export function SensitivityBars({ rows }: { rows: ConditionLiftRow[] }) {
  const sorted = [...rows].sort((a, b) => effectiveLift(b) - effectiveLift(a));

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-4 text-xs text-muted" aria-hidden="true">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-4 rounded-sm bg-series-1" /> Antes de sus momentos (5 min)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-4 rounded-sm bg-chart-reference" /> Resto del tiempo en el salón
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4 bg-foreground" /> Margen probable (95 %)
        </span>
      </div>

      <ul className="space-y-4">
        {sorted.map((r) => {
          const evidence = evidenceFor(r);
          const lift = effectiveLift(r);
          const ev = pct(r.event_pct);
          const base = pct(r.baseline_pct);
          const low = pct(r.wilson_low);
          const high = pct(r.wilson_high);
          const description = `${conditionTitle(r.condition)}: ${Math.round(ev)} % de sus momentos (${r.events_with} de ${r.events_total}) frente a ${Math.round(base)} % del resto del tiempo. ${EVIDENCE_LABEL[evidence]}.`;
          return (
            <li key={r.condition} title={description}>
              <div className="mb-1 flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="font-medium">{conditionTitle(r.condition)}</span>
                <span className="flex items-center gap-2">
                  {evidence !== "insuficiente" && lift > 0 && (
                    <span className="text-muted">{formatLift(lift)}</span>
                  )}
                  <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${EVIDENCE_CLASS[evidence]}`}>
                    {EVIDENCE_LABEL[evidence]}
                  </span>
                </span>
              </div>
              <div className="space-y-1" aria-label={description} role="img">
                <div className="flex items-center gap-2">
                  <div className="relative h-3 flex-1">
                    <div className="h-3 rounded-r bg-series-1" style={{ width: `${ev}%` }} />
                    {/* El margen probable solo se dibuja si la condición apareció; con 0 casos confunde. */}
                    {r.events_with > 0 && (
                      <div
                        className="absolute top-1/2 h-0.5 -translate-y-1/2 bg-foreground"
                        style={{ left: `${low}%`, width: `${Math.max(high - low, 0.5)}%` }}
                      />
                    )}
                  </div>
                  <span className="w-28 shrink-0 text-right text-xs text-muted">
                    {Math.round(ev)} % ({r.events_with}/{r.events_total})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative h-3 flex-1">
                    <div className="h-3 rounded-r bg-chart-reference" style={{ width: `${base}%` }} />
                  </div>
                  <span className="w-28 shrink-0 text-right text-xs text-muted">{Math.round(base)} % del tiempo</span>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
