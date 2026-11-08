import { PATTERNS } from "@/lib/thresholds";
import type { ChildPatterns } from "../queries";

const pct = (part: number, total: number) => Math.round((100 * part) / total);

// Solo coincidencias: nunca causas ni diagnósticos (skill marca-tuli).
export function PatternsCard({ patterns }: { patterns: ChildPatterns | null }) {
  const withContext = Number(patterns?.events_with_context ?? 0);

  return (
    <section className="rounded-xl border border-border bg-white p-4">
      <h2 className="text-lg font-semibold">Qué se repite antes de los momentos</h2>

      {!patterns || withContext < PATTERNS.minEventsForPattern ? (
        <p className="mt-2 text-muted">
          Todavía no hay suficientes momentos con lecturas previas para mostrar
          coincidencias (se necesitan al menos {PATTERNS.minEventsForPattern}; hay{" "}
          {withContext}).
        </p>
      ) : (
        <ul className="mt-3 list-disc space-y-2 pl-5">
          <li>
            En <strong>{Number(patterns.noise_high_events)} de {withContext}</strong>{" "}
            momentos ({pct(Number(patterns.noise_high_events), withContext)}%) hubo
            picos de ruido de {PATTERNS.noiseHigh} dB o más en los{" "}
            {PATTERNS.windowMinutes} minutos previos.
            {patterns.baseline_noise_high_pct !== null && (
              <>
                {" "}
                En el resto del tiempo, solo el{" "}
                <strong>{Number(patterns.baseline_noise_high_pct)}%</strong> de las
                lecturas del salón tuvo picos así.
              </>
            )}
          </li>
          <li>
            En <strong>{Number(patterns.light_swing_events)} de {withContext}</strong>{" "}
            momentos ({pct(Number(patterns.light_swing_events), withContext)}%) la luz
            cambió {PATTERNS.lightSwing} lux o más en esa ventana.
          </li>
          {patterns.avg_temp_before !== null && patterns.avg_humidity_before !== null && (
            <li>
              Antes de los momentos, la temperatura promedio fue de{" "}
              {Number(patterns.avg_temp_before)} °C y la humedad de{" "}
              {Number(patterns.avg_humidity_before)}%.
            </li>
          )}
        </ul>
      )}

      <p className="mt-3 text-xs text-muted">
        Últimos {PATTERNS.days} días. Son coincidencias entre el ambiente y los
        momentos registrados; no indican la causa. Tuli no es un dispositivo
        médico ni ofrece diagnósticos.
      </p>
    </section>
  );
}
