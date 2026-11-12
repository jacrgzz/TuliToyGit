import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { requireUser } from "@/features/auth/queries";
import { getChild } from "@/features/children/queries";
import { listEventsSince } from "@/features/events/queries";
import { summarize } from "@/features/insights/evidence";
import { comboSummary } from "@/features/insights/combo";
import { SensitivityBars } from "@/features/insights/components/SensitivityBars";
import { episodesSummary, timeOfDaySummary, trendSummary } from "@/features/insights/patterns";
import {
  getConditionCombo,
  getConditionLift,
  getDailyCounts,
  getEpisodes,
  getHourlyHeatmap,
  getNoiseDistribution,
} from "@/features/insights/queries";
import { thresholdSummary } from "@/features/insights/threshold";
import { interventionSummary, INTERVENTION_CAVEAT } from "@/features/interventions/compare";
import { compareIntervention, listInterventions } from "@/features/interventions/queries";
import { PrintButton } from "@/features/reports/PrintButton";
import { formatDateTimeShort } from "@/lib/format";
import { parsePeriod } from "@/lib/period";
import { PATTERNS } from "@/lib/thresholds";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type Props = PageProps<"/dashboard/ninos/[id]/reporte">;

async function Report({ params, searchParams }: { params: Props["params"]; searchParams: Props["searchParams"] }) {
  await requireUser();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  if (!UUID.test(id)) notFound();
  const days = parsePeriod(sp.dias);

  const child = await getChild(id); // RLS: null si el usuario no puede ver al niño
  if (!child) notFound();

  const [lift, heat, daily, episodes, dist, combo, interventions, events] = await Promise.all([
    getConditionLift(child.id, days),
    getHourlyHeatmap(child.id, days),
    getDailyCounts(child.id, days),
    getEpisodes(child.id, days),
    getNoiseDistribution(child.id, days),
    getConditionCombo(child.id, days),
    listInterventions(child.id),
    listEventsSince(child.id, days),
  ]);
  const compared = await Promise.all(
    interventions.map(async (i) => ({ ...i, summary: interventionSummary(await compareIntervention(child.id, i.started_on)) })),
  );
  const accidental = events.filter((e) => e.accidental).length;
  const withReadings = events.filter((e) => !e.accidental && (e.readings_count ?? 0) > 0).length;
  const generated = formatDateTimeShort(new Date().toISOString());

  const findings = [
    ...summarize(lift),
    thresholdSummary(dist),
    comboSummary(combo),
    timeOfDaySummary(heat),
    trendSummary(daily),
    episodesSummary(episodes),
  ];

  return (
    <article className="mx-auto max-w-3xl space-y-6 print:max-w-none">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={`/dashboard/ninos/${child.id}/resumen?dias=${days}`} className="text-sm text-muted hover:underline">
          ← Volver a {child.display_name}
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={`/dashboard/ninos/${child.id}/reporte.csv?dias=${days}`}
            className="rounded-xl border border-border bg-white px-4 py-2 text-sm font-medium hover:bg-tint"
          >
            Descargar CSV
          </a>
          <PrintButton />
        </div>
      </div>

      <header className="border-b border-border pb-4">
        <p className="text-sm font-semibold text-brand">Tuli</p>
        <h1 className="text-2xl font-bold">Reporte de coincidencias: {child.display_name}</h1>
        <p className="text-sm text-muted">
          Últimos {days} días · {events.length} {events.length === 1 ? "momento registrado" : "momentos registrados"} ({withReadings} con lecturas de la caja que cuentan en los análisis) · generado el {generated} (hora de México)
        </p>
      </header>

      <section>
        <h2 className="text-lg font-semibold">Resumen</h2>
        <ul className="mt-2 list-disc space-y-2 pl-5">
          {findings.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold">Qué condiciones acompañan sus momentos</h2>
        <SensitivityBars rows={lift} />
      </section>

      {compared.length > 0 && (
        <section>
          <h2 className="mb-2 text-lg font-semibold">Ajustes y cambios registrados</h2>
          <ul className="space-y-2">
            {compared.map((i) => (
              <li key={i.id}>
                <strong>{i.title}</strong> (desde el {i.started_on}). {i.summary}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted">{INTERVENTION_CAVEAT}</p>
        </section>
      )}

      <section className="rounded-xl border border-border p-4 text-sm">
        <h2 className="text-base font-semibold">Cómo leer este reporte</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-muted">
          <li>
            Tuli <strong>no es un dispositivo médico ni ofrece diagnósticos</strong>. Muestra coincidencias entre el
            ambiente del salón y los momentos en que el niño usó su juguete; <strong>no indican la causa</strong>.
          </li>
          <li>
            Cada condición se compara con el resto del tiempo del salón en ventanas de {PATTERNS.windowMinutes} minutos.
            La evidencia es alta con al menos {PATTERNS.strongEvents} momentos; con menos de {PATTERNS.minEvents} no se
            muestra ninguna conclusión.
          </li>
          <li>
            {accidental > 0
              ? `${accidental} ${accidental === 1 ? "pulsación marcada como accidental no se cuenta" : "pulsaciones marcadas como accidentales no se cuentan"} en los análisis (sí aparecen en el CSV, marcadas).`
              : "Ninguna pulsación se ha marcado como accidental en este periodo."}
          </li>
          <li>Los días sin lecturas de la caja no se cuentan como cero. Los umbrales (por ejemplo, {PATTERNS.noiseHigh} dB) son provisionales hasta validarlos con especialistas.</li>
          <li>
            Es una herramienta de apoyo para conversar con familias y especialistas. Cualquier decisión sobre el niño la
            toman las personas que lo acompañan.
          </li>
        </ul>
      </section>
    </article>
  );
}

export default function ReportPage(props: Props) {
  return (
    <Suspense fallback={<p className="text-muted">Preparando el reporte…</p>}>
      <Report params={props.params} searchParams={props.searchParams} />
    </Suspense>
  );
}
