import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getViewerRole, requireUser } from "@/features/auth/queries";
import { EventNoteForm } from "@/features/notes/components/EventNoteForm";
import { getEventNote } from "@/features/notes/queries";
import { getChild } from "@/features/children/queries";
import { EventReadingsTable } from "@/features/events/components/EventReadingsTable";
import { getEventReadings, getEventSummary } from "@/features/events/queries";
import { formatDateTime } from "@/lib/format";
import { LEVEL_CLASS, LEVEL_LABEL, noiseLevel, PATTERNS } from "@/lib/thresholds";

const fmt = (n: number | null, unit = "") =>
  n === null ? "—" : `${Math.round(n * 10) / 10}${unit}`;

async function EventView({ params }: { params: PageProps<"/dashboard/eventos/[id]">["params"] }) {
  await requireUser();
  const { id } = await params;
  const eventId = Number(id);
  if (!Number.isInteger(eventId) || eventId <= 0) notFound();

  // RLS: si el evento no es de un niño que el usuario puede ver, no hay fila → 404.
  const summary = await getEventSummary(eventId);
  if (!summary || summary.occurred_at === null || summary.child_id === null) notFound();

  const [child, readings, role, note] = await Promise.all([
    getChild(summary.child_id),
    getEventReadings(eventId),
    getViewerRole(),
    getEventNote(eventId),
  ]);

  const peak = summary.noise_peak_max;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={child ? `/dashboard/ninos/${child.id}` : "/dashboard"}
          className="text-sm text-muted hover:underline"
        >
          ← Volver{child ? ` a ${child.display_name}` : ""}
        </Link>
        <h1 className="mt-1 text-2xl font-bold">
          Momento del {formatDateTime(summary.occurred_at)}
        </h1>
        {summary.accidental && (
          <p className="text-sm font-medium text-muted">
            Marcado como accidental: no cuenta en los análisis ni en las gráficas.
          </p>
        )}
        {summary.ts_source !== "ntp" && (
          <p className="text-sm text-attention">
            La hora de este momento es aproximada (el juguete no tenía la hora sincronizada).
          </p>
        )}
      </div>

      <section>
        <h2 className="mb-3 text-lg font-semibold">
          Condiciones en los {PATTERNS.windowMinutes} minutos previos
        </h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-xl border border-border bg-white p-4">
            <p className="text-sm text-muted">Pico de ruido</p>
            <p className="mt-1 text-2xl font-bold">{fmt(peak, " dB")}</p>
            {peak !== null && (
              <span
                className={`mt-2 inline-block rounded-full border px-2 py-0.5 text-xs font-medium ${LEVEL_CLASS[noiseLevel(peak)]}`}
              >
                {LEVEL_LABEL[noiseLevel(peak)]}
              </span>
            )}
          </div>
          <div className="rounded-xl border border-border bg-white p-4">
            <p className="text-sm text-muted">Ruido promedio</p>
            <p className="mt-1 text-2xl font-bold">{fmt(summary.noise_avg, " dB")}</p>
          </div>
          <div className="rounded-xl border border-border bg-white p-4">
            <p className="text-sm text-muted">Luz (mín. a máx.)</p>
            <p className="mt-1 text-2xl font-bold">
              {fmt(summary.light_min)} – {fmt(summary.light_max)}
              <span className="ml-1 text-base font-normal text-muted">lux</span>
            </p>
          </div>
          <div className="rounded-xl border border-border bg-white p-4">
            <p className="text-sm text-muted">Temp. y humedad prom.</p>
            <p className="mt-1 text-2xl font-bold">
              {fmt(summary.temp_avg, " °C")} · {fmt(summary.humidity_avg, "%")}
            </p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Lecturas de la caja ({readings.length})</h2>
        <EventReadingsTable rows={readings} />
      </section>

      {role === "teacher" && (
        <EventNoteForm
          eventId={eventId}
          initialNote={note?.note ?? ""}
          initialAccidental={note?.accidental ?? false}
          hasNote={!!note}
        />
      )}
      {role === "admin" && note && (
        <div className="rounded-xl border border-border bg-white p-4 text-sm">
          <h2 className="text-lg font-semibold">Nota del docente</h2>
          <p className="mt-1 whitespace-pre-wrap">{note.note || "(sin texto)"}</p>
        </div>
      )}

      <p className="text-xs text-muted">
        Estas son coincidencias entre el ambiente y el momento registrado; no indican la causa.
        Tuli no es un dispositivo médico ni ofrece diagnósticos.
      </p>
    </div>
  );
}

export default function EventPage(props: PageProps<"/dashboard/eventos/[id]">) {
  return (
    <Suspense fallback={<p className="text-muted">Cargando…</p>}>
      <EventView params={props.params} />
    </Suspense>
  );
}
