"use client";

import { useEffect, useRef, useState } from "react";
import { sendDemoPress, sendDemoReading } from "../demo-actions";

const WINDOW_MS = 10_000; // una lectura cada 10 s, como la caja real
const SAMPLE_MS = 100; // el ruido se muestrea cada 100 ms; se envía promedio y pico

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
const time = () => new Date().toLocaleTimeString("es-MX", { hour12: false });

export function DemoPanel() {
  const [pressMsg, setPressMsg] = useState<string | null>(null);
  const [pressBusy, setPressBusy] = useState(false);

  const [micOn, setMicOn] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [level, setLevel] = useState<number | null>(null);
  const [offset, setOffset] = useState(94); // dBFS → dB aproximados; calibrar con un sonómetro
  const [manualNoise, setManualNoise] = useState(50);
  const [light, setLight] = useState(650);
  const [temp, setTemp] = useState(24);
  const [hum, setHum] = useState(48);
  const [autoSend, setAutoSend] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  // Valores actuales para usarlos dentro de los intervalos sin reiniciarlos.
  const live = useRef({ offset, manualNoise, light, temp, hum, micOn });
  useEffect(() => {
    live.current = { offset, manualNoise, light, temp, hum, micOn };
  });
  const samples = useRef<number[]>([]);

  // Micrófono: solo calcula el nivel en el dispositivo. Nunca se graba ni se envía audio.
  useEffect(() => {
    if (!micOn) return;
    let stream: MediaStream | null = null;
    let ctx: AudioContext | null = null;
    let timer: ReturnType<typeof setInterval> | undefined;
    let cancelled = false;

    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((s) => {
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        stream = s;
        ctx = new AudioContext();
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 2048;
        ctx.createMediaStreamSource(s).connect(analyser);
        const buf = new Float32Array(analyser.fftSize);
        timer = setInterval(() => {
          analyser.getFloatTimeDomainData(buf);
          let sum = 0;
          for (const v of buf) sum += v * v;
          const rms = Math.sqrt(sum / buf.length);
          const dbfs = 20 * Math.log10(Math.max(rms, 1e-8));
          const db = clamp(dbfs + live.current.offset, 0, 130);
          samples.current.push(db);
          setLevel(db);
        }, SAMPLE_MS);
      })
      .catch(() => {
        setMicError("No se pudo usar el micrófono. Revisa el permiso del navegador.");
        setMicOn(false);
      });

    return () => {
      cancelled = true;
      clearInterval(timer);
      stream?.getTracks().forEach((t) => t.stop());
      void ctx?.close();
    };
  }, [micOn]);

  // Envío automático de una lectura cada 10 s.
  useEffect(() => {
    if (!autoSend) return;
    const send = async () => {
      const v = live.current;
      const s = samples.current;
      samples.current = [];
      const useMic = v.micOn && s.length > 0;
      const avg = useMic ? s.reduce((a, b) => a + b, 0) / s.length : v.manualNoise;
      const peak = useMic ? Math.max(...s) : v.manualNoise + 5;
      const r = await sendDemoReading({
        noise_avg: Math.round(avg * 10) / 10,
        noise_peak: Math.round(clamp(peak, 0, 130) * 10) / 10,
        light_lux: v.light,
        temp_c: v.temp,
        humidity_pct: v.hum,
      });
      setStatus(r.ok ? `Lectura enviada ${time()}` : r.error);
    };
    void send();
    const timer = setInterval(send, WINDOW_MS);
    return () => clearInterval(timer);
  }, [autoSend]);

  async function press() {
    setPressBusy(true);
    const r = await sendDemoPress();
    setPressMsg(r.ok ? `Momento registrado a las ${time()}` : r.error);
    setPressBusy(false);
  }

  const field = "mt-1 w-full";

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-border bg-white p-4">
        <h2 className="text-lg font-semibold">Juguete virtual</h2>
        <p className="mt-1 text-sm text-muted">
          Cada toque registra un momento, igual que el juguete real.
        </p>
        <button
          type="button"
          onClick={press}
          disabled={pressBusy}
          className="mt-4 w-full rounded-2xl bg-brand py-8 text-xl font-bold text-white hover:bg-brand-dark disabled:opacity-60"
        >
          {pressBusy ? "Registrando…" : "Presionar el juguete"}
        </button>
        {pressMsg && (
          <p role="status" className="mt-2 text-sm">
            {pressMsg}
          </p>
        )}
      </section>

      <section className="rounded-xl border border-border bg-white p-4">
        <h2 className="text-lg font-semibold">Caja virtual</h2>
        <p className="mt-1 text-sm text-muted">
          Envía una lectura cada 10 segundos. El micrófono solo calcula el nivel de
          ruido en tu dispositivo; no se graba ni se envía audio.
        </p>

        <div className="mt-4 space-y-4">
          <div>
            <button
              type="button"
              onClick={() => {
                setMicError(null);
                setLevel(null);
                setMicOn((on) => !on);
              }}
              className="rounded-lg border border-border bg-white px-4 py-2 font-medium hover:bg-gray-50"
            >
              {micOn ? "Apagar micrófono" : "Usar micrófono para el ruido"}
            </button>
            {micOn && (
              <span className="ml-3 text-2xl font-bold">
                {level === null ? "…" : Math.round(level)}{" "}
                <span className="text-base font-normal text-muted">dB aprox.</span>
              </span>
            )}
            {micError && (
              <p role="alert" className="mt-2 text-sm text-high">
                {micError}
              </p>
            )}
          </div>

          {micOn ? (
            <label className="block text-sm">
              Calibración del micrófono: {offset}
              <input
                type="range"
                min={70}
                max={110}
                value={offset}
                onChange={(e) => setOffset(Number(e.target.value))}
                className={field}
              />
              <span className="text-xs text-muted">
                Ajusta hasta que coincida con un sonómetro (valor aproximado).
              </span>
            </label>
          ) : (
            <label className="block text-sm">
              Ruido manual: {manualNoise} dB
              <input
                type="range"
                min={20}
                max={100}
                value={manualNoise}
                onChange={(e) => setManualNoise(Number(e.target.value))}
                className={field}
              />
            </label>
          )}

          <label className="block text-sm">
            Luz: {light} lux
            <input type="range" min={0} max={3000} step={10} value={light} onChange={(e) => setLight(Number(e.target.value))} className={field} />
          </label>
          <label className="block text-sm">
            Temperatura: {temp} °C
            <input type="range" min={10} max={40} step={0.5} value={temp} onChange={(e) => setTemp(Number(e.target.value))} className={field} />
          </label>
          <label className="block text-sm">
            Humedad: {hum} %
            <input type="range" min={0} max={100} value={hum} onChange={(e) => setHum(Number(e.target.value))} className={field} />
          </label>

          <button
            type="button"
            onClick={() => setAutoSend((on) => !on)}
            className={`w-full rounded-lg px-4 py-3 font-semibold ${
              autoSend ? "bg-foreground text-white" : "bg-brand text-white hover:bg-brand-dark"
            }`}
          >
            {autoSend ? "Detener envío" : "Empezar a enviar lecturas"}
          </button>
          {status && (
            <p role="status" className="text-sm">
              {status}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
