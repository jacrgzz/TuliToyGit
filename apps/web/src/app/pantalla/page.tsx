import { Suspense } from "react";
import { LiveRefresh } from "@/features/events/components/LiveRefresh";
import { getLatestReading } from "@/features/readings/queries";
import { ageMs } from "@/lib/format";
import { ALERT, LEVEL_CLASS, LEVEL_LABEL, noiseLevel } from "@/lib/thresholds";
import { requireTeacherRoom } from "../dashboard/_components/room";
import { ScreenControls } from "./ScreenControls";

const round = (n: number | null) => (n === null ? "—" : String(Math.round(n * 10) / 10));

// Semáforo de ruido del salón para proyectar. NO muestra nombres, conteos de momentos ni perfiles:
// nada de ningún niño. Exige sesión de docente (para otro rol responde con 404).
async function Screen() {
  const room = await requireTeacherRoom();
  if (!room) return <p className="text-lg">Todavía no tienes un salón vinculado a tu cuenta.</p>;

  const reading = await getLatestReading(room.id);
  const stale = !reading || ageMs(reading.measured_at) > ALERT.maxAgeMs;
  const dB = reading ? (reading.noise_peak ?? reading.noise_avg) : null;
  const level = !stale && dB !== null ? noiseLevel(dB) : null;

  return (
    <div className="flex flex-1 flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold sm:text-3xl">{room.name}</h1>
        <LiveRefresh />
      </header>

      <div
        role="status"
        aria-live="polite"
        className={`flex flex-1 flex-col items-center justify-center rounded-3xl border-8 p-6 text-center ${
          level ? LEVEL_CLASS[level] : "border-border bg-gray-100 text-muted"
        }`}
      >
        <p className="text-sm font-medium uppercase tracking-wide sm:text-base">Ruido del salón</p>
        <p className="mt-2 text-6xl font-extrabold sm:text-8xl">{level ? LEVEL_LABEL[level] : "Sin datos recientes"}</p>
        {level && reading && reading.noise_avg !== null && (
          <p className="mt-4 text-3xl font-semibold tabular-nums sm:text-5xl">{round(reading.noise_avg)} dB</p>
        )}
        {!level && <p className="mt-4 text-lg sm:text-2xl">La caja no ha enviado lecturas en los últimos 2 minutos.</p>}
      </div>

      <dl className="grid grid-cols-2 gap-4 text-center sm:gap-6">
        <div className="rounded-2xl border border-border p-4">
          <dt className="text-sm text-muted sm:text-base">Temperatura</dt>
          <dd className="mt-1 text-3xl font-bold sm:text-4xl">{stale ? "—" : `${round(reading!.temp_c)} °C`}</dd>
        </div>
        <div className="rounded-2xl border border-border p-4">
          <dt className="text-sm text-muted sm:text-base">Luz</dt>
          <dd className="mt-1 text-3xl font-bold sm:text-4xl">{stale ? "—" : `${round(reading!.light_lux)} lux`}</dd>
        </div>
      </dl>

      <ScreenControls />
      <p className="text-center text-xs text-muted">
        Esta pantalla muestra solo el ruido, la temperatura y la luz del salón. No muestra datos de ningún niño.
      </p>
    </div>
  );
}

export default function ScreenPage() {
  return (
    <Suspense fallback={<p className="text-muted">Cargando…</p>}>
      <Screen />
    </Suspense>
  );
}
