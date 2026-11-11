import Link from "next/link";
import { Suspense } from "react";
import { WeekDays } from "@/features/insights/components/WeekDays";
import { childWeek, familyCoincidence, meetingQuestions } from "@/features/insights/family";
import { timeOfDaySummary } from "@/features/insights/patterns";
import { getConditionLift, getDailyCounts, getHourlyHeatmap } from "@/features/insights/queries";
import { KPI } from "@/lib/thresholds";
import { todayMx } from "@/lib/time-mx";
import { loadChild } from "../_lib";

type Props = PageProps<"/dashboard/ninos/[id]/semana">;
const DAYS = 30; // periodo de "lo que más coincidió" y de las horas

// "Su semana" (vista de la familia): números de esta semana contados en positivo, lo que más coincidió
// en una frase y preguntas para platicar con el docente. Ver docs/vista-tutor.md.
async function Week({ params }: { params: Props["params"] }) {
  const child = await loadChild(params);
  const [daily, lift, heat] = await Promise.all([
    getDailyCounts(child.id, KPI.baselineDays + 14),
    getConditionLift(child.id, DAYS),
    getHourlyHeatmap(child.id, DAYS),
  ]);
  const week = childWeek(daily, todayMx());
  const coincidence = familyCoincidence(lift);

  return (
    <div className="space-y-6">
      <section className="space-y-4 rounded-xl border border-border bg-white p-4">
        <h2 className="text-lg font-semibold">Su semana</h2>
        <ul className="list-disc space-y-1 pl-5">
          {week.sentences.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
        <WeekDays days={week.days} />
      </section>

      <section className="space-y-2 rounded-xl border border-border bg-white p-4">
        <h2 className="text-lg font-semibold">Lo que más coincidió</h2>
        <p>{coincidence.sentence}</p>
        <p>{timeOfDaySummary(heat)}</p>
        <p className="text-xs text-muted">Últimos {DAYS} días. Tuli muestra coincidencias con el ambiente del salón; no es un dispositivo médico.</p>
      </section>

      <section className="space-y-2 rounded-xl border border-border bg-white p-4">
        <h2 className="text-lg font-semibold">Para platicar con su maestra o maestro</h2>
        <ul className="list-disc space-y-1 pl-5">
          {meetingQuestions(coincidence.top).map((q) => (
            <li key={q}>{q}</li>
          ))}
        </ul>
        <Link href="/dashboard/ayuda#familias" className="text-sm font-medium text-brand hover:underline">
          Más ideas en «Cómo leer los datos» →
        </Link>
      </section>

      <section className="text-sm">
        <h2 className="mb-1 font-semibold">¿Quieres ver más detalle?</h2>
        <p className="text-muted">El mismo análisis que usa su docente, con gráficas.</p>
        <div className="mt-2 flex flex-wrap gap-4">
          <Link href={`/dashboard/ninos/${child.id}/perfil`} className="font-medium text-brand hover:underline">
            Análisis del ambiente →
          </Link>
          <Link href={`/dashboard/ninos/${child.id}/horarios`} className="font-medium text-brand hover:underline">
            Días y horas →
          </Link>
        </div>
      </section>
    </div>
  );
}

export default function SemanaPage(props: Props) {
  return (
    <Suspense fallback={<p className="text-muted">Cargando…</p>}>
      <Week params={props.params} />
    </Suspense>
  );
}
