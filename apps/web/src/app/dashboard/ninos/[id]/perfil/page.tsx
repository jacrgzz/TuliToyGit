import { Suspense } from "react";
import { comboSummary } from "@/features/insights/combo";
import { ComboTable } from "@/features/insights/components/ComboTable";
import { EventCurveChart } from "@/features/insights/components/EventCurveChart";
import { PeriodSelector } from "@/features/insights/components/PeriodSelector";
import { ProfileSummary } from "@/features/insights/components/ProfileSummary";
import { SensitivityBars } from "@/features/insights/components/SensitivityBars";
import { ThresholdChart } from "@/features/insights/components/ThresholdChart";
import { personalThreshold, thresholdSummary } from "@/features/insights/threshold";
import { getActivityLift, getConditionCombo, getConditionLift, getEventCurve, getNoiseDistribution } from "@/features/insights/queries";
import { parsePeriod } from "@/lib/period";
import { loadChild } from "../_lib";

type Props = PageProps<"/dashboard/ninos/[id]/perfil">;

async function Profile({ params, searchParams }: { params: Props["params"]; searchParams: Props["searchParams"] }) {
  const [child, sp] = await Promise.all([loadChild(params), searchParams]);
  const days = parsePeriod(sp.dias);
  const [lift, curve, activityLift, dist, combo] = await Promise.all([
    getConditionLift(child.id, days),
    getEventCurve(child.id, days),
    getActivityLift(child.id, days),
    getNoiseDistribution(child.id, days),
    getConditionCombo(child.id, days),
  ]);

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Perfil de sensibilidad</h2>
          <PeriodSelector current={days} basePath={`/dashboard/ninos/${child.id}/perfil`} />
        </div>
        <ProfileSummary rows={lift} days={days} />
        <div className="card">
          <h3 className="mb-3 font-semibold">Qué condiciones acompañan sus momentos</h3>
          <SensitivityBars rows={lift} />
        </div>
        <div className="card">
          <h3 className="mb-1 font-semibold">Ruido antes y después de sus momentos</h3>
          {curve.length > 0 ? (
            <EventCurveChart points={curve} />
          ) : (
            <p className="text-muted">Todavía no hay momentos con lecturas de la caja en este periodo.</p>
          )}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Nivel de ruido y combinaciones</h2>
        <div className="card">
          <h3 className="mb-1 font-semibold">Umbral personal de ruido</h3>
          <p className="mb-3 text-sm">{thresholdSummary(dist)}</p>
          {dist.length > 0 && <ThresholdChart bins={dist} thresholdDb={personalThreshold(dist)?.db ?? null} />}
        </div>
        <div className="card">
          <h3 className="mb-1 font-semibold">Ruido y luz juntos</h3>
          <p className="mb-3 text-sm">{comboSummary(combo)}</p>
          <ComboTable rows={combo} />
        </div>
      </section>

      {activityLift.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Actividades de la bitácora</h2>
          <div className="card">
            <p className="mb-3 text-sm text-muted">
              ¿Sus momentos ocurren más a menudo durante alguna actividad que en el resto del tiempo?
            </p>
            <SensitivityBars rows={activityLift} eventsLabel="Sus momentos durante la actividad" baselineLabel="Tiempo del salón durante la actividad" />
          </div>
        </section>
      )}
    </div>
  );
}

export default function PerfilPage(props: Props) {
  return (
    <Suspense fallback={<p className="text-muted">Cargando…</p>}>
      <Profile params={props.params} searchParams={props.searchParams} />
    </Suspense>
  );
}
