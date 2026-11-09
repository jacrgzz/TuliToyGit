import Link from "next/link";
import { formatDateTime } from "@/lib/format";
import { LEVEL_CLASS, LEVEL_LABEL, noiseLevel, PATTERNS } from "@/lib/thresholds";
import type { EventSummary } from "../queries";

export function EventList({ events }: { events: EventSummary[] }) {
  if (events.length === 0) {
    return (
      <p className="rounded-xl border border-border bg-white p-4 text-muted">
        Todavía no hay momentos registrados con el juguete.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {events.map((e) => {
        const peak = e.noise_peak_max;
        const swing =
          e.light_max !== null && e.light_min !== null ? e.light_max - e.light_min : null;
        return (
          <li key={e.event_id}>
            <Link
              href={`/dashboard/eventos/${e.event_id}`}
              className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-white p-4 hover:bg-gray-50 ${e.accidental ? "opacity-60" : ""}`}
            >
              <div>
                <p className="font-medium">{e.occurred_at ? formatDateTime(e.occurred_at) : "Hora desconocida"}</p>
                {e.accidental && (
                  <p className="text-xs font-medium text-muted">Marcado como accidental (no cuenta en los análisis)</p>
                )}
                {e.ts_source !== "ntp" && (
                  <p className="text-xs text-attention">Hora aproximada</p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                {e.readings_count === 0 || peak === null ? (
                  <span className="text-muted">Sin lecturas previas</span>
                ) : (
                  <>
                    <span className="text-muted">Pico de ruido previo:</span>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-xs font-medium ${LEVEL_CLASS[noiseLevel(peak)]}`}
                    >
                      {Math.round(peak)} dB · {LEVEL_LABEL[noiseLevel(peak)]}
                    </span>
                    {swing !== null && swing >= PATTERNS.lightSwing && (
                      <span className="rounded-full border border-attention bg-attention/10 px-2 py-0.5 text-xs font-medium text-attention">
                        Luz cambió {Math.round(swing)} lux
                      </span>
                    )}
                  </>
                )}
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
