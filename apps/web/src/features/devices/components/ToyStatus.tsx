import { timeAgo } from "@/lib/format";
import { BATTERY } from "@/lib/thresholds";
import type { ToyStatusInfo } from "../queries";

// C7: última señal y batería del juguete. El juguete solo envía al usarse (y, si el firmware lo
// hace, con latidos), así que NO se afirma "sin señal": se muestra cuándo fue la última.
export function ToyStatus({ toy }: { toy: ToyStatusInfo | undefined }) {
  if (!toy || !toy.last_seen_at) {
    return <p className="mt-1 text-xs text-muted">Juguete: todavía sin señal registrada.</p>;
  }
  const low = toy.battery_pct !== null && toy.battery_pct < BATTERY.low;
  return (
    <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
      <span>Última señal del juguete {timeAgo(toy.last_seen_at)}</span>
      {toy.battery_pct !== null && (
        <span className={low ? "rounded-full border border-attention bg-attention/10 px-2 py-0.5 font-medium text-attention" : ""}>
          Batería {Math.round(toy.battery_pct)} %{low ? " · baja" : ""}
        </span>
      )}
    </p>
  );
}
