"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteEventNote, saveEventNote } from "../actions";

// C4: nota en un momento y "pulsación accidental". Solo el docente del salón la ve y la escribe.
// Una pulsación accidental sale de TODOS los análisis (para todos los roles).
export function EventNoteForm({
  eventId,
  initialNote,
  initialAccidental,
  hasNote,
}: {
  eventId: number;
  initialNote: string;
  initialAccidental: boolean;
  hasNote: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [note, setNote] = useState(initialNote);
  const [accidental, setAccidental] = useState(initialAccidental);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  function save() {
    setMessage(null);
    start(async () => {
      const r = await saveEventNote({ eventId, note, accidental });
      setMessage(r.ok ? { ok: true, text: "Guardado." } : { ok: false, text: r.error });
      if (r.ok) router.refresh();
    });
  }

  function clear() {
    setMessage(null);
    start(async () => {
      const r = await deleteEventNote(eventId);
      if (r.ok) {
        setNote("");
        setAccidental(false);
        setMessage({ ok: true, text: "Nota quitada." });
        router.refresh();
      } else setMessage({ ok: false, text: r.error });
    });
  }

  return (
    <div className="card">
      <h2 className="text-lg font-semibold">Nota del docente</h2>
      <p className="mt-1 text-sm text-muted">
        Solo la ven los docentes del salón. Usa el alias del niño y evita datos que lo identifiquen.
      </p>
      <label className="mt-3 block text-sm">
        Qué pasaba en ese momento (opcional)
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={500}
          rows={3}
          className="mt-1 w-full rounded-xl border border-border bg-white px-2 py-1.5"
        />
        <span className="text-xs text-muted">{note.length}/500</span>
      </label>
      <label className="mt-2 flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          checked={accidental}
          onChange={(e) => setAccidental(e.target.checked)}
          className="mt-1"
        />
        <span>
          Fue una pulsación accidental
          <span className="block text-xs text-muted">No se contará en ningún análisis ni gráfica (para nadie).</span>
        </span>
      </label>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="rounded-lg bg-brand px-4 py-2 font-medium text-white hover:bg-brand-dark disabled:opacity-60"
        >
          {pending ? "Guardando…" : "Guardar"}
        </button>
        {hasNote && (
          <button
            type="button"
            onClick={clear}
            disabled={pending}
            className="rounded-xl border border-border px-3 py-2 text-sm hover:bg-tint disabled:opacity-60"
          >
            Quitar nota
          </button>
        )}
        {message && (
          <span role={message.ok ? "status" : "alert"} className={`text-sm ${message.ok ? "text-muted" : "text-high"}`}>
            {message.text}
          </span>
        )}
      </div>
    </div>
  );
}
