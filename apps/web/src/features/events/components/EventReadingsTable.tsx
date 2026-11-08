import { formatTime } from "@/lib/format";
import { LEVEL_CLASS, noiseLevel } from "@/lib/thresholds";

type Row = {
  reading_id: number | null;
  measured_at: string | null;
  noise_avg: number | null;
  noise_peak: number | null;
  light_lux: number | null;
  temp_c: number | null;
  humidity_pct: number | null;
};

const fmt = (n: number | null, digits = 1) =>
  n === null ? "—" : String(Math.round(n * 10 ** digits) / 10 ** digits);

export function EventReadingsTable({ rows }: { rows: Row[] }) {
  if (rows.length === 0) {
    return (
      <p className="rounded-xl border border-border bg-white p-4 text-muted">
        No hay lecturas de la caja en los 5 minutos previos a este momento.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-white">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-border text-muted">
          <tr>
            <th className="px-3 py-2 font-medium">Hora</th>
            <th className="px-3 py-2 font-medium">Ruido prom. (dB)</th>
            <th className="px-3 py-2 font-medium">Ruido pico (dB)</th>
            <th className="px-3 py-2 font-medium">Luz (lux)</th>
            <th className="px-3 py-2 font-medium">Temp. (°C)</th>
            <th className="px-3 py-2 font-medium">Humedad (%)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.reading_id} className="border-b border-border last:border-0">
              <td className="px-3 py-2">{r.measured_at ? formatTime(r.measured_at) : "—"}</td>
              <td className="px-3 py-2">{fmt(r.noise_avg)}</td>
              <td className="px-3 py-2">
                {r.noise_peak === null ? (
                  "—"
                ) : (
                  <span
                    className={`rounded-full border px-2 py-0.5 ${LEVEL_CLASS[noiseLevel(r.noise_peak)]}`}
                  >
                    {fmt(r.noise_peak)}
                  </span>
                )}
              </td>
              <td className="px-3 py-2">{fmt(r.light_lux, 0)}</td>
              <td className="px-3 py-2">{fmt(r.temp_c)}</td>
              <td className="px-3 py-2">{fmt(r.humidity_pct)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
