import Link from "next/link";
import type { Kpi } from "../kpis";

// Indicadores de "Hoy". El color no transmite nada por sí solo: cada tarjeta lleva su valor, su frase y
// su referencia en texto. Solo la cobertura de datos lleva una etiqueta ("Suficiente" / "Revisar").
export function KpiCards({ kpis }: { kpis: Kpi[] }) {
  return (
    <section aria-labelledby="kpis-title">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="kpis-title" className="text-lg font-semibold">Indicadores de hoy</h2>
        <Link href="/dashboard/ayuda#indicadores" className="text-sm underline">
          ¿Por qué estos datos?
        </Link>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {kpis.map((k) => (
          <li key={k.id} className="flex flex-col rounded-xl border border-border bg-white p-4">
            <p className="text-sm text-muted">{k.title}</p>
            <p className={`mt-1 text-3xl font-bold ${k.state === "nodata" ? "text-muted" : ""}`}>{k.value}</p>
            {k.id === "cobertura" && k.state !== "nodata" && (
              <span
                className={`mt-1 inline-block self-start rounded-full border px-2 py-0.5 text-xs font-medium ${
                  k.state === "ok" ? "border-calm bg-calm/10 text-calm" : "border-attention bg-attention/10 text-attention"
                }`}
              >
                {k.state === "ok" ? "Suficiente" : "Revisar"}
              </span>
            )}
            <p className="mt-2 text-sm">{k.sentence}</p>
            <p className="mt-auto pt-2 text-xs text-muted">{k.reference}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
