"use client";

import { Bell, CornerDownLeft, Search, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { filterSearch, type Notice, type SearchItem } from "./top-bar";

const TONE_CLASS: Record<Notice["tone"], string> = {
  high: "bg-high/10 text-high",
  attention: "bg-attention/10 text-attention",
  idle: "bg-tint text-brand-dark",
};
const TONE_LABEL: Record<Notice["tone"], string> = { high: "Ahora", attention: "Revisar", idle: "Sin datos" };

// Barra superior del dashboard. La búsqueda es un <dialog> modal (foco atrapado y Esc nativos) con un
// combobox: flechas para moverse, Enter para abrir. La campana abre una lista de avisos con enlaces.
export function TopBarClient({ items, notices }: { items: SearchItem[]; notices: Notice[] }) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const bellWrap = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [bellOpen, setBellOpen] = useState(false);
  const listId = useId();
  const panelId = useId();
  const results = filterSearch(items, query);

  const openSearch = () => {
    dialog.current?.showModal();
    input.current?.focus();
  };

  // ⌘K / Ctrl+K abre la búsqueda desde cualquier parte del dashboard.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        dialog.current?.showModal();
        input.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // La campana se cierra con Esc o con un clic fuera.
  useEffect(() => {
    if (!bellOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!bellWrap.current?.contains(e.target as Node)) setBellOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setBellOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [bellOpen]);

  const go = (item: SearchItem | undefined) => {
    if (!item) return;
    dialog.current?.close();
    if (item.newTab) window.open(item.href, "_blank", "noopener");
    else router.push(item.href);
  };

  const onInputKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      go(results[active]);
    }
  };

  return (
    <div className="flex items-center gap-2 rounded-2xl border border-border bg-white p-2 sm:gap-3">
      <button
        type="button"
        onClick={openSearch}
        aria-haspopup="dialog"
        className="flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-xl bg-surface-soft px-3 text-left text-sm text-muted hover:bg-tint"
      >
        <Search aria-hidden className="h-4 w-4 shrink-0" />
        <span className="truncate">Buscar niño o sección…</span>
        <kbd className="ml-auto hidden rounded-md border border-border bg-white px-1.5 text-xs sm:inline">⌘K</kbd>
      </button>

      <div ref={bellWrap} className="relative">
        <button
          type="button"
          onClick={() => setBellOpen((o) => !o)}
          aria-expanded={bellOpen}
          aria-controls={panelId}
          aria-label={notices.length ? `Avisos, ${notices.length}` : "Avisos, ninguno"}
          className="relative grid h-11 w-11 place-items-center rounded-xl border border-border bg-white hover:bg-tint"
        >
          <Bell aria-hidden className="h-5 w-5" />
          {notices.length > 0 && (
            <span aria-hidden className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-brand px-1 text-[11px] font-semibold text-white">
              {notices.length}
            </span>
          )}
        </button>
        {bellOpen && (
          <div
            id={panelId}
            className="absolute right-0 z-40 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-border bg-white p-2 shadow-[0_16px_40px_rgb(46_22_80/0.16)]"
          >
            <p className="px-2 py-1.5 text-sm font-semibold">Avisos</p>
            {notices.length === 0 ? (
              <p className="px-2 pb-2 text-sm text-muted">Nada que revisar por ahora.</p>
            ) : (
              <ul className="max-h-[60vh] space-y-1 overflow-y-auto">
                {notices.map((n) => (
                  <li key={n.id}>
                    <Link href={n.href} onClick={() => setBellOpen(false)} className="flex gap-3 rounded-xl p-2 hover:bg-surface-soft">
                      <span className={`mt-0.5 h-fit shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${TONE_CLASS[n.tone]}`}>
                        {TONE_LABEL[n.tone]}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-medium">{n.title}</span>
                        <span className="block text-xs text-muted">{n.detail}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <dialog
        ref={dialog}
        aria-label="Buscar"
        onClose={() => {
          setQuery("");
          setActive(0);
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) e.currentTarget.close(); // clic en el fondo
        }}
        className="mx-auto mt-[12vh] w-[min(36rem,calc(100vw-2rem))] rounded-3xl border border-border bg-white p-0 text-foreground shadow-[0_24px_60px_rgb(46_22_80/0.22)] backdrop:bg-[#2e1650]/30"
      >
        <div className="flex items-center gap-3 border-b border-border px-4">
          <Search aria-hidden className="h-5 w-5 shrink-0 text-muted" />
          <label htmlFor={`${listId}-input`} className="sr-only">
            Buscar niño o sección
          </label>
          <input
            ref={input}
            id={`${listId}-input`}
            type="text"
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={results[active] ? `${listId}-${active}` : undefined}
            autoComplete="off"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={onInputKey}
            placeholder="Buscar niño o sección…"
            className="min-h-14 flex-1 bg-transparent text-base outline-none placeholder:text-muted"
          />
          <button type="button" onClick={() => dialog.current?.close()} aria-label="Cerrar búsqueda" className="rounded-lg p-2 hover:bg-tint">
            <X aria-hidden className="h-5 w-5" />
          </button>
        </div>
        <ul id={listId} role="listbox" aria-label="Resultados" className="max-h-[50vh] overflow-y-auto p-2">
          {results.length === 0 && <li className="px-3 py-6 text-center text-sm text-muted">Sin resultados para «{query}».</li>}
          {results.map((r, i) => (
            <li
              key={r.href}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseEnter={() => setActive(i)}
              onClick={() => go(r)}
              className={`flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 ${i === active ? "bg-tint" : ""}`}
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{r.label}</span>
                <span className="block truncate text-xs text-muted">{r.hint}</span>
              </span>
              {i === active && <CornerDownLeft aria-hidden className="h-4 w-4 text-muted" />}
            </li>
          ))}
        </ul>
        <p className="border-t border-border px-4 py-2 text-xs text-muted">↑ ↓ para moverte · Enter para abrir · Esc para cerrar</p>
      </dialog>
    </div>
  );
}
