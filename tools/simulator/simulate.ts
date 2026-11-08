// Simulador de juguete y caja. Cliente de REFERENCIA: lo que envía este script es
// exactamente lo que debe enviar el firmware real (docs/contrato-datos.md).
// Valida cada mensaje con el MISMO esquema que usa /api/ingest.
//
// Uso (desde tools/simulator):
//   npm run simulate                       tiempo real, caja cada 10 s, pulsaciones cada 40-90 s
//   npm run simulate -- --interval 5       caja cada 5 s (demo más viva)
//   npm run simulate -- --backfill 120     antes, genera 120 min de historia
//   npm run simulate -- --backfill 120 --no-live    solo historia y termina
//
// Patrón simulado: antes de cada pulsación el ruido sube (picos > 75 dB) y la luz parpadea;
// así la vista de contexto tiene algo que mostrar.

import { ingestMessage, type IngestMessage } from "../../apps/web/src/features/ingest/schemas";

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(`--${name}`);
const opt = (name: string, fallback: number) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? Number(args[i + 1]) : fallback;
};

const INGEST_URL = process.env.INGEST_URL ?? "http://localhost:3000/api/ingest";
const TOY_TOKEN = process.env.TOY_DEVICE_TOKEN;
const BOX_TOKEN = process.env.BOX_DEVICE_TOKEN;
const TOY_ID = process.env.TOY_DEVICE_ID ?? "tuli-toy-01";
const BOX_ID = process.env.BOX_DEVICE_ID ?? "tuli-box-01";

if (!TOY_TOKEN || !BOX_TOKEN) {
  console.error(
    "Faltan TOY_DEVICE_TOKEN y BOX_DEVICE_TOKEN en apps/web/.env.local.\n" +
      "Corre primero: npm run provision",
  );
  process.exit(1);
}

const intervalS = opt("interval", 10);
const backfillMin = opt("backfill", 0);
const live = !flag("no-live");

// seq arranca en la hora actual (ms) para no chocar con corridas anteriores.
let seqBase = Date.now();
const nextSeq = () => seqBase++;

const rand = (min: number, max: number) => min + Math.random() * (max - min);
const round1 = (n: number) => Math.round(n * 10) / 10;
const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n));

// Ambiente base con deriva lenta (temperatura y humedad suben y bajan con el "día").
function baseline(t: Date) {
  const minutes = t.getTime() / 60000;
  return {
    temp: 24 + 2 * Math.sin(minutes / 90),
    hum: 48 + 6 * Math.sin(minutes / 120 + 1),
    lux: 650 + 120 * Math.sin(minutes / 60),
  };
}

// ¿Este instante cae en la ventana previa a una pulsación? (25 s a 5 s antes)
function isPreTrigger(t: Date, pressTimes: number[]) {
  return pressTimes.some((p) => p - t.getTime() <= 25_000 && p - t.getTime() >= 5_000);
}

function makeReading(t: Date, pressTimes: number[]): IngestMessage {
  const b = baseline(t);
  const spike = isPreTrigger(t, pressTimes);
  const noiseAvg = spike ? rand(70, 80) : rand(42, 58);
  const noisePeak = spike ? rand(84, 95) : noiseAvg + rand(2, 12);
  const lux = spike ? b.lux + rand(-350, 900) : b.lux + rand(-30, 30); // parpadeo
  return ingestMessage.parse({
    type: "reading",
    device_id: BOX_ID,
    ts: t.toISOString(),
    ts_source: "ntp",
    seq: nextSeq(),
    window_s: intervalS,
    noise_avg: round1(noiseAvg),
    noise_peak: round1(Math.min(noisePeak, 110)),
    light_lux: Math.round(clamp(lux, 0, 5000)),
    temp_c: round1(b.temp + rand(-0.2, 0.2)),
    humidity_pct: round1(clamp(b.hum + rand(-1, 1), 0, 100)),
  });
}

function makePress(t: Date): IngestMessage {
  return ingestMessage.parse({
    type: "press",
    device_id: TOY_ID,
    ts: t.toISOString(),
    ts_source: "ntp",
    seq: nextSeq(),
  });
}

async function send(msg: IngestMessage) {
  const token = msg.type === "press" ? TOY_TOKEN : BOX_TOKEN;
  try {
    const res = await fetch(INGEST_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(msg),
    });
    const ok = res.status === 201;
    if (!ok || msg.type === "press") {
      console.log(
        `${ok ? "✔" : "✘"} ${msg.type} ${msg.device_id} seq=${msg.seq} → ${res.status} ${ok ? "" : await res.text()}`,
      );
    }
    return ok;
  } catch (e) {
    console.error(`✘ no se pudo conectar a ${INGEST_URL}: ${(e as Error).message}`);
    return false;
  }
}

async function backfill(minutes: number) {
  const end = Date.now() - 60_000;
  const start = end - minutes * 60_000;
  // Pulsaciones cada 4 a 10 min en la historia
  const presses: number[] = [];
  for (let t = start + rand(120, 300) * 1000; t < end; t += rand(240, 600) * 1000) presses.push(t);

  console.log(`Historia: ${minutes} min, ${presses.length} pulsaciones, caja cada ${intervalS} s…`);
  let n = 0;
  for (let t = start; t < end; t += intervalS * 1000) {
    if (!(await send(makeReading(new Date(t), presses)))) return false;
    n++;
  }
  for (const p of presses) if (!(await send(makePress(new Date(p))))) return false;
  console.log(`Historia enviada: ${n} lecturas y ${presses.length} pulsaciones.`);
  return true;
}

async function runLive() {
  console.log(`En vivo → ${INGEST_URL} (Ctrl+C para detener)`);
  const nextPressDelay = () => rand(40, 90) * 1000;
  let pressTimes = [Date.now() + nextPressDelay()];

  setInterval(async () => {
    const now = new Date();
    await send(makeReading(now, pressTimes));
  }, intervalS * 1000);

  setInterval(async () => {
    const next = pressTimes[pressTimes.length - 1];
    if (Date.now() >= next) {
      await send(makePress(new Date()));
      pressTimes = [Date.now() + nextPressDelay()];
    }
  }, 1000);
}

if (backfillMin > 0) {
  const ok = await backfill(backfillMin);
  if (!ok) process.exit(1);
}
if (live) await runLive();
