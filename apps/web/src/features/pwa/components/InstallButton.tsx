"use client";

import { Download, Share, X } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import { IOS_STEPS, installMode, type InstallMode } from "../install";

// Evento de Chrome/Edge/Android (no está en los tipos de TypeScript).
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

// El navegador puede lanzar beforeinstallprompt antes de que React monte el botón, por eso se escucha
// desde que se carga el módulo y se guarda aquí.
let deferred: BeforeInstallPromptEvent | null = null;
let justInstalled = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    emit();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    justInstalled = true;
    emit();
  });
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const mq = window.matchMedia("(display-mode: standalone)");
  mq.addEventListener("change", cb);
  return () => {
    listeners.delete(cb);
    mq.removeEventListener("change", cb);
  };
}

function getSnapshot(): InstallMode {
  const standalone =
    justInstalled ||
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return installMode({
    userAgent: navigator.userAgent,
    standalone,
    hasPrompt: deferred !== null,
    maxTouchPoints: navigator.maxTouchPoints ?? 0,
  });
}

const getServerSnapshot = (): InstallMode => "unavailable";

// Botón "Instalar Tuli". En Android/Chrome abre el diálogo del sistema; en iPhone/iPad muestra la guía.
// No aparece si la app ya está instalada o si el navegador no permite instalar.
// variant "chip": pequeño, para la barra superior del teléfono. "full": ancho completo, para la cuenta y Ayuda.
export function InstallButton({ variant = "full" }: { variant?: "chip" | "full" }) {
  const mode = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [guide, setGuide] = useState(false);

  if (mode === "installed" || mode === "unavailable") return null;

  async function onClick() {
    if (mode === "ios") {
      setGuide(true);
      return;
    }
    const event = deferred;
    if (!event) return;
    await event.prompt();
    await event.userChoice;
    // El evento solo sirve una vez; si la persona dijo que no, Chrome lo vuelve a lanzar más adelante.
    deferred = null;
    emit();
  }

  const className =
    variant === "chip"
      ? "flex items-center gap-1.5 rounded-full bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-dark"
      : "flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand-dark";

  return (
    <>
      <button type="button" onClick={onClick} className={className} aria-haspopup={mode === "ios" ? "dialog" : undefined}>
        <Download aria-hidden className="h-4 w-4" />
        {variant === "chip" ? "Instalar" : "Instalar Tuli"}
      </button>
      {guide && (
        <div className="fixed inset-0 z-50 print:hidden" role="dialog" aria-modal="true" aria-labelledby="install-guide-title">
          <button type="button" aria-label="Cerrar" className="absolute inset-0 bg-black/30" onClick={() => setGuide(false)} />
          <div className="absolute inset-x-0 bottom-0 rounded-t-2xl bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] md:inset-x-auto md:left-1/2 md:top-1/2 md:bottom-auto md:w-[420px] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p id="install-guide-title" className="text-lg font-bold">
                Instalar Tuli en iPhone o iPad
              </p>
              <button type="button" onClick={() => setGuide(false)} aria-label="Cerrar" className="rounded-lg p-2 hover:bg-tint">
                <X aria-hidden className="h-5 w-5" />
              </button>
            </div>
            <ol className="space-y-2">
              {IOS_STEPS.map((step, i) => (
                <li key={step} className="flex gap-3 text-sm">
                  <span aria-hidden className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-tint text-xs font-bold text-brand-dark">
                    {i + 1}
                  </span>
                  <span>
                    {step}
                    {i === 1 && <Share aria-hidden className="ml-1 inline h-4 w-4 align-text-bottom text-brand" />}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </>
  );
}
