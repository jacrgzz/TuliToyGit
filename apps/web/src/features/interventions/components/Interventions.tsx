"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createIntervention, deleteIntervention } from "../actions";
import { INTERVENTION_CAVEAT } from "../compare";

// C5: ajustes por niño (cambio de lugar, audífonos, otra rutina…). Cada uno se compara antes y después.
// `summaries` llega ya calculado desde el servidor (frase por ajuste).
type Item = { id: string; title: string; started_on: string; note: string; summary: string };

const field = "mt-1 w-full rounded-lg border border-border bg-white px-2 py-1.5";

export function Interventions({ childId, items, canEdit }: { childId: string; items: Item[]; canEdit: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit(form: HTMLFormElement) {
    const data = new FormData(form);
    setError(null);
    start(async () => {
      const r = await createIntervention({
        childId,
        title: String(data.get("title") ?? ""),
        startedOn: String(data.get("startedOn") ?? ""),
        note: String(data.get("note") ?? ""),
      });
      if (!r.ok) return setError(r.error);
      form.reset();
      router.refresh();
    });
  }

  function remove(id: string) {
    setError(null);
    start(async () => {
      const r = await deleteIntervention(id);
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
            ¿Qué cambió?
            <input name="title" required maxLength={80} placeholder="Ej. Cambió de lugar, lejos de la ventana" className={field} />
          </label>
          <label className="text-sm">
            Desde el día
            <input name="startedOn" type="date" required className={field} />
          </label>
          <label className="text-sm sm:col-span-2">
            Nota (opcional)
            <input name="note" maxLength={300} className={field} />
          </label>
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-brand px-4 py-2 font-medium text-white hover:bg-brand-dark disabled:opacity-60"
            >
              {pending ? "Guardando…" : "Registrar el cambio"}
            </button>
            {error && (
              <p role="alert" className="mt-2 text-sm text-high">
                {error}
              </p>
            )}
          </div>
        </form>
      )}

      {items.length === 0 ? (
        <p className="rounded-xl border border-border bg-white p-4 text-muted">
          {canEdit
            ? "Cuando hagas un cambio (de lugar, de rutina, un apoyo nuevo), regístralo aquí para comparar los momentos antes y después."
            : "Todavía no hay cambios registrados."}
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((i) => (
            <li key={i.id} className="rounded-xl border border-border bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{i.title}</p>
                  <p className="text-sm text-muted">Desde el {i.started_on}{i.note ? ` · ${i.note}` : ""}</p>
                </div>
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => remove(i.id)}
                    disabled={pending}
                    className="rounded-lg border border-border px-2 py-1 text-xs hover:bg-gray-50 disabled:opacity-60"
                    aria-label={`Quitar ${i.title}`}
                  >
                    Quitar
                  </button>
                )}
              </div>
              <p className="mt-2 text-sm">{i.summary}</p>
            </li>
          ))}
        </ul>
      )}
      {items.length > 0 && <p className="text-xs text-muted">{INTERVENTION_CAVEAT}</p>}
    </div>
  );
}
