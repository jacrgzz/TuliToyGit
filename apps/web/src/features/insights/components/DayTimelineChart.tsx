"use client";

import { CartesianGrid, ComposedChart, Legend, Line, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

// B1: línea del día. Ruido del salón (promedio y pico, un solo eje en dB) con una marca vertical
// por cada momento de cualquier niño. Las marcas llevan la inicial del alias; si hay muchas
// no se rotulan y la lista de abajo las detalla (el valor nunca depende solo del gráfico).

type Point = { t: number; noise_avg: number | null; noise_peak: number | null };
type Ev = { child_id: string; name: string; t: number };
type Act = { id: string; name: string; start: number; end: number };

const TZ = "America/Mexico_City";
const hhmm = (t: number) =>
  new Date(t).toLocaleTimeString("es-MX", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false });
const initial = (name: string) => name.trim().split(/\s+/).pop()?.slice(0, 2) ?? "?";

export function DayTimelineChart({ points, events, activities = [] }: { points: Point[]; events: Ev[]; activities?: Act[] }) {
  if (points.length === 0) {
    return <p className="text-muted">No hay lecturas de la caja en este día.</p>;
  }
  const first = points[0].t;
  const last = points[points.length - 1].t;
  const labelled = events.length <= 14;

  return (
    <div>
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={points} margin={{ top: 16, right: 16, bottom: 4, left: 0 }}>
            <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
            <XAxis
              dataKey="t"
              type="number"
              scale="time"
              domain={[first, last]}
              tickFormatter={hhmm}
              tick={{ fill: "var(--muted)", fontSize: 12 }}
              stroke="var(--chart-grid)"
            />
            <YAxis
              unit=" dB"
              width={60}
              allowDecimals={false}
              domain={["auto", "auto"]}
              tick={{ fill: "var(--muted)", fontSize: 12 }}
              stroke="var(--chart-grid)"
            />
            <Line dataKey="noise_avg" name="Ruido promedio" stroke="var(--series-1)" strokeWidth={2} dot={false} isAnimationActive={false} />
            <Line dataKey="noise_peak" name="Pico de ruido" stroke="var(--series-2)" strokeWidth={2} dot={false} isAnimationActive={false} />
            {activities
              .filter((a) => a.end >= first && a.start <= last)
              .map((a) => (
                <ReferenceArea
                  key={a.id}
                  x1={Math.max(a.start, first)}
                  x2={Math.min(a.end, last)}
                  fill="var(--chart-reference)"
                  fillOpacity={0.18}
                  stroke="none"
                  label={{ value: a.name, position: "insideTopLeft", fill: "var(--muted)", fontSize: 11 }}
                />
              ))}
            {events
              .filter((e) => e.t >= first && e.t <= last)
              .map((e, i) => (
                <ReferenceLine
                  key={`${e.t}-${i}`}
                  x={e.t}
                  stroke="var(--foreground)"
                  strokeOpacity={0.35}
                  label={labelled ? { value: initial(e.name), position: "top", fill: "var(--muted)", fontSize: 11 } : undefined}
                />
              ))}
            <Tooltip
              labelFormatter={(t) => hhmm(Number(t))}
              formatter={(v, name) => [`${v} dB`, name]}
            />
            <Legend
              wrapperStyle={{ fontSize: 12 }}
              formatter={(value) => <span style={{ color: "var(--muted)" }}>{value}</span>}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-xs text-muted">
        Las líneas verticales son los momentos de los niños ({events.length} en el día).{activities.length > 0 && " Las franjas grises son las actividades de la bitácora."}
        {!labelled && " Son muchos para rotularlos; el detalle está en la lista."}
      </p>
      {events.length > 0 && (
        <details className="mt-2 text-xs">
          <summary className="cursor-pointer text-muted">Ver la lista de momentos del día</summary>
          <ul className="mt-2 max-h-48 columns-2 gap-4 overflow-auto sm:columns-3">
            {events.map((e, i) => (
              <li key={`${e.t}-${i}`}>
                {hhmm(e.t)} · {e.name}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
