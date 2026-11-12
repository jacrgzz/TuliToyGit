import Link from "next/link";

// Resumen de la semana: números y comparación con el mismo tramo de la semana anterior.
// Sin valoraciones ("mejor" o "peor") ni causas.
export function WeekSummary({ sentences, noisiestHour, notable }: { sentences: string[]; noisiestHour: string | null; notable: string[] }) {
  return (
    <section aria-labelledby="week-title" className="card">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="week-title" className="text-lg font-semibold">Esta semana</h2>
        <Link href="/dashboard/salon" className="text-sm underline">
          Ver el detalle del salón
        </Link>
      </div>
      <ul className="list-disc space-y-1 pl-5">
        {sentences.map((s) => (
          <li key={s}>{s}</li>
        ))}
        {noisiestHour && <li>{noisiestHour}</li>}
        {notable.length > 0 && (
          <li>
            Coincidencias notables en {notable.length === 1 ? "el perfil de" : "los perfiles de"} {notable.join(", ")}. Son coincidencias, no causas.
          </li>
        )}
      </ul>
    </section>
  );
}
