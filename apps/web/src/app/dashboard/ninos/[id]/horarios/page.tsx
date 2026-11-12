import { Suspense } from "react";
import { EpisodesList } from "@/features/insights/components/EpisodesList";
import { HourHeatmap } from "@/features/insights/components/HourHeatmap";
import { PeriodSelector } from "@/features/insights/components/PeriodSelector";
import { TrendChart } from "@/features/insights/components/TrendChart";
import { timeOfDaySummary, trendSummary } from "@/features/insights/patterns";
import { getDailyCounts, getEpisodes, getHourlyHeatmap } from "@/features/insights/queries";
import { parsePeriod } from "@/lib/period";
import { loadChild } from "../_lib";

type Props = PageProps<"/dashboard/ninos/[id]/horarios">;

async function Schedule({ params, searchParams }: { params: Props["params"]; searchParams: Props["searchParams"] }) {
  const [child, sp] = await Promise.all([loadChild(params), searchParams]);
  const days = parsePeriod(sp.dias);
  const [heat, daily, episodes] = await Promise.all([
    getHourlyHeatmap(child.id, days),
    getDailyCounts(child.id, days),
    getEpisodes(child.id, days),
  ]);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Cuándo ocurren sus momentos</h2>
        <PeriodSelector current={days} basePath={`/dashboard/ninos/${child.id}/horarios`} />
      </div>
      <div className="card">
        <h3 className="mb-1 font-semibold">Día y hora</h3>
        <p className="mb-3 text-sm">{timeOfDaySummary(heat)}</p>
        <HourHeatmap cells={heat} unit="momentos" format={(n) => String(Math.round(n))} caption="Momentos por día de la semana y hora" />
      </div>
      <div className="card">
        <h3 className="mb-1 font-semibold">Tendencia por día</h3>
        <p className="mb-3 text-sm">{trendSummary(daily)}</p>
        <TrendChart rows={daily} />
      </div>
      <div className="card">
        <h3 className="mb-2 font-semibold">Episodios</h3>
        <EpisodesList episodes={episodes} />
      </div>
    </section>
  );
}

export default function HorariosPage(props: Props) {
  return (
    <Suspense fallback={<p className="text-muted">Cargando…</p>}>
      <Schedule params={props.params} searchParams={props.searchParams} />
    </Suspense>
  );
}
