"use client";

import { Maximize, Minimize } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const REFRESH_MS = 30_000;

// Reloj, pantalla completa y "no apagar la pantalla" (Wake Lock). Además refresca los datos cada 30 s,
// así el aviso de "sin datos recientes" aparece aunque no llegue ninguna lectura nueva.
export function ScreenControls() {
  const router = useRouter();
  const [time, setTime] = useState("");
  const [full, setFull] = useState(false);
  const [awake, setAwake] = useState(false);

  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", timeZone: "America/Mexico_City" }));
    tick();
    const clock = setInterval(tick, 10_000);
    const refresh = setInterval(() => router.refresh(), REFRESH_MS);
    return () => {
      clearInterval(clock);
      clearInterval(refresh);
    };
  }, [router]);

  useEffect(() => {
    const onChange = () => setFull(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  // Wake Lock: si el navegador no lo soporta, no pasa nada. Se vuelve a pedir al regresar a la pestaña.
  useEffect(() => {
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;
    const request = async () => {
      try {
        if (!("wakeLock" in navigator) || document.visibilityState !== "visible") return;
        lock = await navigator.wakeLock.request("screen");
        if (cancelled) void lock.release();
        else setAwake(true);
        lock.addEventListener("release", () => setAwake(false));
      } catch {
        setAwake(false);
      }
    };
    void request();
    const onVisible = () => void request();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      void lock?.release();
    };
  }, []);

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      /* el navegador no lo permite: no pasa nada */
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-3xl font-semibold tabular-nums sm:text-4xl" aria-label="Hora en México">
        {time}
      </p>
      <div className="flex items-center gap-3 text-sm text-muted">
        <span>{awake ? "La pantalla no se apagará" : "La pantalla puede apagarse sola"}</span>
        <button
          type="button"
          onClick={toggleFullscreen}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 font-medium text-foreground hover:bg-gray-50"
        >
          {full ? <Minimize aria-hidden className="h-4 w-4" /> : <Maximize aria-hidden className="h-4 w-4" />}
          {full ? "Salir de pantalla completa" : "Pantalla completa"}
        </button>
      </div>
    </div>
  );
}
