import { DOW_LABEL, hasHiddenHours, hourRange, MAP_FIRST_HOUR, MAP_LAST_HOUR, visibleDows, type HeatCell } from "../patterns";

// A5 y B2: mapa de calor día de la semana × hora (diagrama de dispersión de Touchette).
// Un solo tono (series-1) de claro a oscuro: la magnitud nunca se codifica con arcoíris.
// Cada celda muestra su valor en texto y tiene título: no depende solo del color.

export function HourHeatmap({
  cells,
  unit,
  format = (n) => String(Math.round(n * 10) / 10),
  caption,
}: {
  cells: HeatCell[];
  unit: string; // p. ej. "momentos" o "% de lecturas con pico alto"
  format?: (n: number) => string;
  caption: string;
}) {
  const dows = visibleDows(cells);
  const { min, max } = hourRange(cells);
  const hours = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  const value = new Map(cells.map((c) => [`${c.dow}-${c.hour}`, c.value]));
  const top = Math.max(0, ...cells.map((c) => c.value));

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[320px] border-separate border-spacing-0.5 text-center text-xs">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr>
              <th className="w-14 px-1 py-1 text-right font-normal text-muted" scope="col">
                Hora
              </th>
              {dows.map((d) => (
                <th key={d} scope="col" className="px-1 py-1 font-medium">
                  {DOW_LABEL[d - 1]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {hours.map((h) => (
              <tr key={h}>
                <th scope="row" className="px-1 py-1 text-right font-normal text-muted">
                  {h}–{h + 1}
                </th>
                {dows.map((d) => {
                  const v = value.get(`${d}-${h}`) ?? 0;
                  const intensity = top > 0 ? v / top : 0;
                  return (
                    <td
                      key={d}
                      title={`${DOW_LABEL[d - 1]} ${h} a ${h + 1} h: ${format(v)} ${unit}`}
                      className="h-8 rounded-sm"
                      style={{
                        background:
                          v > 0
                            ? `color-mix(in srgb, var(--series-1) ${Math.round(12 + intensity * 88)}%, white)`
                            : "var(--chart-grid)",
                        color: intensity > 0.55 ? "white" : "var(--foreground)",
                      }}
                    >
                      {v > 0 ? format(v) : ""}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 flex items-center gap-2 text-xs text-muted" aria-hidden="true">
        Menos
        <span
          className="inline-block h-2.5 w-24 rounded-sm"
          style={{ background: "linear-gradient(to right, color-mix(in srgb, var(--series-1) 12%, white), var(--series-1))" }}
        />
        Más ({unit})
      </p>
      {hasHiddenHours(cells) && (
        <p className="mt-1 text-xs text-muted">
          Hay datos fuera de las {MAP_FIRST_HOUR} a {MAP_LAST_HOUR} h que no se muestran en el mapa.
        </p>
      )}
    </div>
  );
}
