"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { formatDateTimeShort } from "@/lib/format";
import { createActivity, deleteActivity } from "../actions";
import { ACTIVITY_KINDS, ACTIVITY_LABEL, type ActivityKind } from "../schemas";

// C3: bitácora de actividades del salón. El docente marca bloques del día (examen, recreo, música…);
// la actividad pasa a ser una condición más en el perfil de cada niño. Solo el docente escribe.

type Item = { id: string; kind: string; name: string; starts_at: string; ends_at: string };

const field = "mt-1 w-full rounded-lg border border-border bg-white px-2 py-1.5";

export function ActivityLog({
  classroomId,
  activities,
  canEdit,
}: {
  classroomId: string;
  activities: Item[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [kind, setKind] = useState<ActivityKind>("recreo");

  function submit(form: HTMLFormElement) {
    const data = new FormData(form);
    setError(null);
    start(async () => {
      const r = await createActivity({
        classroomId,
        kind,
        name: String(data.get("name") ?? ""),
        starts: String(data.get("starts") ?? ""),
        ends: String(data.get("ends") ?? ""),
      });
      if (!r.ok) return setError(r.error);
      form.reset();
      router.refresh();
    });
  }

  function remove(id: string) {
    setError(null);
    start(async () => {
      const r = await deleteActivity(id);
      if (!r.ok) return setError(r.error);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {canEdit && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit(e.currentTarget);
          }}
          className="grid gap-3 rounded-xl border border-border bg-white p-4 sm:grid-cols-2"
        >
          <label className="text-sm">
            Tipo
            <select value={kind} onChange={(e) => setKind(e.target.value as ActivityKind)} className={field}>
              {ACTIVITY_KINDS.map((k) => (
                <option key={k} value={k}>
                  {ACTIVITY_LABEL[k]}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Nombre
            <input name="name" required maxLength={80} placeholder="Ej. Examen de matemáticas" className={field} />
          </label>
          <label className="text-sm">
            Empieza (hora de México)
            <input name="starts" type="datetime-local" required className={field} />
          </label>
          <label className="text-sm">
            Termina
            <input name="ends" type="datetime-local" required className={field} />
          </label>
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-brand px-4 py-2 font-medium text-white hover:bg-brand-dark disabled:opacity-60"
            >
              {pending ? "Guardando…" : "Agregar a la bitácora"}
            </button>
            {error && (
              <p role="alert" className="mt-2 text-sm text-high">
                {error}
              </p>
            )}
          </div>
        </form>
      )}

      {activities.length === 0 ? (
        <p className="rounded-xl border border-border bg-white p-4 text-muted">
          {canEdit
            ? "Todavía no hay actividades en los últimos 14 días. Márcalas para ver si los momentos coinciden con alguna."
            : "No hay actividades en la bitácora de los últimos 14 días."}
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-white">
          {activities.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-sm">
              <span>
                <strong>{a.name}</strong>{" "}
                <span className="text-muted">
                  · {ACTIVITY_LABEL[a.kind as ActivityKind] ?? a.kind} · {formatDateTimeShort(a.starts_at)} a{" "}
                  {formatDateTimeShort(a.ends_at)}
                </span>
              </span>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => remove(a.id)}
                  disabled={pending}
                  className="rounded-lg border border-border px-2 py-1 text-xs hover:bg-gray-50 disabled:opacity-60"
                  aria-label={`Quitar ${a.name}`}
                >
                  Quitar
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
