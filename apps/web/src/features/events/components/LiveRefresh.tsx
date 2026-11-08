"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/browser";

// Escucha Realtime (respeta RLS: solo llegan cambios que el usuario puede ver) y
// refresca los datos del servidor, con un pequeño retraso para agrupar ráfagas.
export function LiveRefresh() {
  const router = useRouter();
  const [live, setLive] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      clearTimeout(timer);
      timer = setTimeout(() => router.refresh(), 1500);
    };

    const channel = supabase
      .channel("tuli-live")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "toy_events" }, refresh)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "sensor_readings" }, refresh)
      .subscribe((status) => setLive(status === "SUBSCRIBED"));

    return () => {
      clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [router]);

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs ${
        live ? "border-calm text-calm" : "border-border text-muted"
      }`}
    >
      <span className={`h-2 w-2 rounded-full ${live ? "bg-calm" : "bg-muted"}`} />
      {live ? "En vivo" : "Conectando…"}
    </span>
  );
}
