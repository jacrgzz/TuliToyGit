import Link from "next/link";
import { parsePct, Ring } from "@/lib/ui/Ring";
import type { Kpi } from "../kpis";

// Indicadores de "Hoy". El color no transmite nada por sí solo: cada tarjeta lleva su valor, su frase y
// su referencia en texto. Solo la cobertura de datos lleva una etiqueta ("Suficiente" / "Revisar").
// Los porcentajes van en un anillo; la primera ("Momentos hoy") es la destacada, en morado.
// Escritorio: 3 arriba y 2 más anchas abajo, para que no queden amontonadas.
export function KpiCards({ kpis }: { kpis: Kpi[] }) {
  return (
    <section aria-labelledby="kpis-title">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="kpis-title" className="text-lg font-semibold">Indicadores de hoy</h2>
        <Link href="/dashboard/ayuda#indicadores" className="text-sm font-medium text-brand underline">
          ¿Por qué estos datos?
        </Link>
      </div>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        {kpis.map((k, i) => {
          const pct = k.state === "nodata" ? null : parsePct(k.value);
          const hero = i === 0;
          const span = hero ? "sm:col-span-2" : i < 3 ? "lg:col-span-2" : "lg:col-span-3";
          return (
            <li
              key={k.id}
              className={`card-lift flex flex-col rounded-3xl border p-5 transition ${span} ${
                hero ? "border-brand bg-brand text-white" : "border-border bg-white"
              }`}
            >
              <p className={`text-sm font-medium ${hero ? "text-[#ece6ff]" : "text-muted"}`}>{k.title}</p>
              <div className="mt-2 flex items-center gap-4">
                {pct !== null ? (
                  <Ring value={pct} label={`${pct} %`} />
                ) : (
                  <p className={`text-4xl font-extrabold tracking-tight ${k.state === "nodata" ? (hero ? "text-[#ece6ff]" : "text-muted") : ""}`}>
                    {k.value}
                  </p>
                )}
                <p className="text-sm">{k.sentence}</p>
              </div>
              {k.id === "cobertura" && k.state !== "nodata" && (
                <span
                  className={`mt-3 inline-block self-start rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    k.state === "ok" ? "bg-calm/10 text-calm" : "bg-attention/10 text-attention"
                  }`}
                >
                  {k.state === "ok" ? "Suficiente" : "Revisar"}
                </span>
              )}
              <p className={`mt-auto pt-3 text-xs ${hero ? "text-[#ece6ff]" : "text-muted"}`}>{k.reference}</p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
