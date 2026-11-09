"use client";

import { missingRanges } from "../patterns";
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

// A6: momentos por día hábil (barras) con promedio móvil de 7 días hábiles (línea). Un solo eje.
// Un día sin lecturas de la caja es "sin datos": no se dibuja como cero (una caja apagada no
// es una mejoría) y se lista aparte.

type Row = { day: string; events: number | null; moving_avg: number | null };

const label = (iso: string) => {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
};

export function TrendChart({ rows }: { rows: Row[] }) {
  const data = rows.map((r) => ({ day: label(r.day), full: r.day, events: r.events, avg: r.moving_avg }));
  const missing = missingRanges(rows);

  return (
    <div>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 16, bottom: 4, left: 0 }}>
            <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
            <XAxis
              dataKey="day"
              interval="preserveStartEnd"
              minTickGap={28}
              tick={{ fill: "var(--muted)", fontSize: 12 }}
              stroke="var(--chart-grid)"
            />
            <YAxis
              allowDecimals={false}
              width={36}
              tick={{ fill: "var(--muted)", fontSize: 12 }}
              stroke="var(--chart-grid)"
            />
            <Bar
              dataKey="events"
              name="Momentos del día"
              fill="var(--series-1)"
              radius={[4, 4, 0, 0]}
              maxBarSize={24}
              isAnimationActive={false}
            />
            <Line
              dataKey="avg"
              name="Promedio móvil (7 días hábiles)"
              stroke="var(--series-2)"
              strokeWidth={2}
              dot={false}
              connectNulls
              isAnimationActive={false}
            />
            <Tooltip formatter={(v, name) => [v === null ? "sin datos" : String(v), name]} />
            <Legend
              wrapperStyle={{ fontSize: 12 }}
              formatter={(value) => <span style={{ color: "var(--muted)" }}>{value}</span>}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      {missing.length > 0 && (
        <p className="mt-2 text-xs text-muted">
          Sin lecturas de la caja (no se cuentan como cero): {missing.join("; ")}.
        </p>
      )}
    </div>
  );
}
