"use client";

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

// A3: análisis de épocas superpuestas. Ruido promedio y pico alrededor de sus momentos
// (minuto 0), sobre el rango habitual del salón (percentiles 25 a 75). Un solo eje: todo en dB.

type Point = {
  offset_s: number;
  noise_avg: number | null;
  noise_peak: number | null;
  events: number;
  baseline_p25: number | null;
  baseline_p75: number | null;
};

const sign = (m: number) => (m > 0 ? `+${m}` : `${m}`);

export function EventCurveChart({ points }: { points: Point[] }) {
  const data = points.map((p) => ({
    min: p.offset_s / 60,
    avg: p.noise_avg === null ? null : Number(p.noise_avg),
    peak: p.noise_peak === null ? null : Number(p.noise_peak),
    band:
      p.baseline_p25 === null || p.baseline_p75 === null
        ? null
        : [Number(p.baseline_p25), Number(p.baseline_p75)],
    n: Number(p.events),
  }));
  const maxEvents = Math.max(0, ...data.map((d) => d.n));

  return (
    <div>
      <p className="mb-2 text-xs text-muted">
        Promedio de {maxEvents} momentos alineados en el minuto 0. La franja gris es el ruido habitual
        del salón (la mitad central de sus lecturas).
      </p>
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 16, bottom: 4, left: 0 }}>
            <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
            <XAxis
              dataKey="min"
              type="number"
              domain={[-10, 5]}
              ticks={[-10, -8, -6, -4, -2, 0, 2, 4]}
              tickFormatter={(v: number) => (v === 0 ? "0" : `${sign(v)} min`)}
              tick={{ fill: "var(--muted)", fontSize: 12 }}
              stroke="var(--chart-grid)"
            />
            <YAxis
              unit=" dB"
              width={60}
              domain={["auto", "auto"]}
              allowDecimals={false}
              tick={{ fill: "var(--muted)", fontSize: 12 }}
              stroke="var(--chart-grid)"
            />
            <Area
              dataKey="band"
              name="Ruido habitual del salón"
              stroke="none"
              fill="var(--chart-reference)"
              fillOpacity={0.25}
              isAnimationActive={false}
            />
            <Line
              dataKey="avg"
              name="Ruido promedio"
              stroke="var(--series-1)"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
            <Line
              dataKey="peak"
              name="Pico de ruido"
              stroke="var(--series-2)"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
            <ReferenceLine
              x={0}
              stroke="var(--foreground)"
              strokeOpacity={0.5}
              label={{ value: "Momento", position: "insideTopRight", fill: "var(--muted)", fontSize: 12 }}
            />
            <Tooltip
              labelFormatter={(v) => `${sign(Number(v))} min respecto al momento`}
              formatter={(value, name) =>
                Array.isArray(value)
                  ? [`${value[0]}–${value[1]} dB`, name]
                  : [`${value} dB`, name]
              }
            />
            {/* El texto de la leyenda va en color de texto; el color de la serie solo en la marca. */}
            <Legend
              wrapperStyle={{ fontSize: 12 }}
              formatter={(value) => <span style={{ color: "var(--muted)" }}>{value}</span>}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <details className="mt-2 text-xs">
        <summary className="cursor-pointer text-muted">Ver los datos de la gráfica</summary>
        <div className="mt-2 max-h-64 overflow-auto">
          <table className="w-full text-left">
            <thead className="text-muted">
              <tr>
                <th className="py-1 pr-3 font-medium">Minuto</th>
                <th className="py-1 pr-3 font-medium">Ruido promedio (dB)</th>
                <th className="py-1 pr-3 font-medium">Pico (dB)</th>
                <th className="py-1 font-medium">Momentos</th>
              </tr>
            </thead>
            <tbody>
              {data.map((d) => (
                <tr key={d.min} className="border-t border-border">
                  <td className="py-1 pr-3">{sign(d.min)}</td>
                  <td className="py-1 pr-3">{d.avg ?? "—"}</td>
                  <td className="py-1 pr-3">{d.peak ?? "—"}</td>
                  <td className="py-1">{d.n}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
