import {
  humidityLevel,
  lightLevel,
  LEVEL_CLASS,
  LEVEL_LABEL,
  noiseLevel,
  tempLevel,
  type Level,
} from "@/lib/thresholds";
import { isOlderThan, timeAgo } from "@/lib/format";
import type { LatestReading } from "../queries";

const STALE_MS = 2 * 60 * 1000; // sin lecturas hace más de 2 min = caja desconectada

function Card({
  label,
  value,
  unit,
  level,
}: {
  label: string;
  value: number | null;
  unit: string;
  level: Level | null;
}) {
  return (
    <div className="rounded-xl border border-border bg-white p-4">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 text-3xl font-bold">
        {value === null ? "—" : Math.round(value * 10) / 10}
        <span className="ml-1 text-base font-normal text-muted">{unit}</span>
      </p>
      {level && (
        <span
          className={`mt-2 inline-block rounded-full border px-2 py-0.5 text-xs font-medium ${LEVEL_CLASS[level]}`}
        >
          {LEVEL_LABEL[level]}
        </span>
      )}
    </div>
  );
}

// Debe renderse en un contexto dinámico (usa la hora actual para saber si hay datos recientes).
export function ConditionsPanel({ reading }: { reading: LatestReading | null }) {
  if (!reading) {
    return (
      <p className="rounded-xl border border-border bg-white p-4 text-muted">
        La caja de este salón todavía no ha enviado lecturas.
      </p>
    );
  }

  const stale = isOlderThan(reading.measured_at, STALE_MS);

  return (
    <div>
      <p className={`mb-3 text-sm ${stale ? "font-medium text-attention" : "text-muted"}`}>
        {stale
          ? `Sin lecturas recientes: la última llegó ${timeAgo(reading.measured_at)}.`
          : `Actualizado ${timeAgo(reading.measured_at)}.`}
        {reading.ts_source !== "ntp" && " Hora aproximada."}
      </p>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card
          label="Ruido (aprox.)"
          value={reading.noise_avg}
          unit="dB"
          level={reading.noise_avg === null ? null : noiseLevel(reading.noise_peak ?? reading.noise_avg)}
        />
        <Card
          label="Luz"
          value={reading.light_lux}
          unit="lux"
          level={reading.light_lux === null ? null : lightLevel(reading.light_lux)}
        />
        <Card
          label="Temperatura"
          value={reading.temp_c}
          unit="°C"
          level={reading.temp_c === null ? null : tempLevel(reading.temp_c)}
        />
        <Card
          label="Humedad"
          value={reading.humidity_pct}
          unit="%"
          level={reading.humidity_pct === null ? null : humidityLevel(reading.humidity_pct)}
        />
      </div>
    </div>
  );
}
