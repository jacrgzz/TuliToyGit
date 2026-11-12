"use client";

import { Bar, BarChart, CartesianGrid, Legend, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

// A4: distribución del pico de ruido. Barras agrupadas sobre una escala común (% de sus momentos
// y % del tiempo del salón por intervalo de 5 dB). Un solo eje, en %.

type Bin = { bin_start: number; events_pct: number; baseline_pct: number; events_n: number };

const label = (b: number) => `${b}–${b + 5}`;

export function ThresholdChart({ bins, thresholdDb }: { bins: Bin[]; thresholdDb: number | null }) {
  const data = bins.map((b) => ({
    name: label(b.bin_start),
    events: b.events_pct,
    baseline: b.baseline_pct,
    n: b.events_n,
  }));

  return (
    <div>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 16, bottom: 4, left: 0 }}>
            <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
            <XAxis
              dataKey="name"
              interval="preserveStartEnd"
              minTickGap={24}
              unit=" dB"
              tick={{ fill: "var(--muted)", fontSize: 12 }}
              stroke="var(--chart-grid)"
            />
            <YAxis unit=" %" width={48} tick={{ fill: "var(--muted)", fontSize: 12 }} stroke="var(--chart-grid)" />
            <Bar dataKey="events" name="Antes de sus momentos" fill="var(--series-1)" radius={[8, 8, 2, 2]} maxBarSize={20} isAnimationActive={false} />
            <Bar dataKey="baseline" name="Resto del tiempo en el salón" fill="var(--chart-reference)" radius={[8, 8, 2, 2]} maxBarSize={20} isAnimationActive={false} />
            {thresholdDb !== null && (
              <ReferenceLine
                x={label(thresholdDb)}
                stroke="var(--foreground)"
                strokeOpacity={0.5}
                label={{ value: `≈ ${thresholdDb} dB`, position: "top", fill: "var(--muted)", fontSize: 11 }}
              />
            )}
            <Tooltip formatter={(v, name) => [`${v} %`, name]} labelFormatter={(l) => `Pico de ${l} dB`} />
            <Legend wrapperStyle={{ fontSize: 12 }} formatter={(value) => <span style={{ color: "var(--muted)" }}>{value}</span>} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-1 text-xs text-muted">
        Cada grupo es el pico máximo de ruido de los {5} minutos previos, en intervalos de 5 dB.
      </p>
    </div>
  );
}
