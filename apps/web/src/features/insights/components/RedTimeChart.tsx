"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

// B3: tiempo en zona roja. % de las lecturas del día con pico de ruido alto (un solo eje, 0 a 100 %).
type Row = { day: string; high_pct: number; readings: number };

const label = (iso: string) => {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
};

export function RedTimeChart({ rows, threshold }: { rows: Row[]; threshold: number }) {
  if (rows.length === 0) return <p className="text-muted">No hay lecturas de la caja en este periodo.</p>;
  const data = rows.map((r) => ({ day: label(r.day), pct: r.high_pct, n: r.readings }));

  return (
    <div>
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 16, bottom: 4, left: 0 }}>
            <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
            <XAxis
              dataKey="day"
              interval="preserveStartEnd"
              minTickGap={28}
              tick={{ fill: "var(--muted)", fontSize: 12 }}
              stroke="var(--chart-grid)"
            />
            <YAxis
              unit=" %"
              width={48}
              domain={[0, "auto"]}
              tick={{ fill: "var(--muted)", fontSize: 12 }}
              stroke="var(--chart-grid)"
            />
            <Bar dataKey="pct" name={`Lecturas con pico ≥ ${threshold} dB`} fill="var(--series-1)" radius={[8, 8, 2, 2]} maxBarSize={24} isAnimationActive={false} />
            <Tooltip formatter={(v) => [`${v} %`, `Lecturas con pico ≥ ${threshold} dB`]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-1 text-xs text-muted">
        Porcentaje de las lecturas de cada día hábil con un pico de ruido de {threshold} dB o más.
      </p>
    </div>
  );
}
