"use client";

import { School } from "lucide-react";
import { useId } from "react";

type Room = { id: string; name: string };

// Selector de salón (solo se muestra con 2 salones o más). Se envía solo al cambiar; sin JavaScript queda
// el botón "Cambiar". Variante "icon": en la barra estrecha de tableta, un ícono con el <select> encima.
export function ClassroomPicker({
  rooms,
  selectedId,
  action,
  variant = "full",
}: {
  rooms: Room[];
  selectedId: string;
  action: (formData: FormData) => void | Promise<void>;
  variant?: "full" | "icon";
}) {
  const id = useId();
  const current = rooms.find((r) => r.id === selectedId)?.name ?? "Salón";

  if (variant === "icon") {
    return (
      <form action={action} className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-white hover:bg-gray-50">
        <School aria-hidden className="h-5 w-5" />
        <label htmlFor={id} className="sr-only">
          Salón: {current}
        </label>
        <select
          id={id}
          name="id"
          title={`Salón: ${current}`}
          defaultValue={selectedId}
          onChange={(e) => e.currentTarget.form?.requestSubmit()}
          className="absolute inset-0 cursor-pointer opacity-0"
        >
          {rooms.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </form>
    );
  }

  return (
    <form action={action} className="space-y-1">
      <label htmlFor={id} className="block text-xs font-medium text-muted">
        Salón
      </label>
      <div className="flex gap-2">
        <select
          id={id}
          name="id"
          defaultValue={selectedId}
          onChange={(e) => e.currentTarget.form?.requestSubmit()}
          className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm font-medium"
        >
          {rooms.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
        <noscript>
          <button type="submit" className="rounded-lg border border-border px-3 text-sm">
            Cambiar
          </button>
        </noscript>
      </div>
    </form>
  );
}
