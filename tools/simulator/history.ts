// Genera HISTORIA REALISTA de varios días escolares para probar los análisis del docente.
// Todo pasa por /api/ingest con el contrato v1 (igual que el firmware real).
//
// Uso (desde tools/simulator, con npm run dev corriendo):
//   npm run history                  últimos 5 días hábiles, 8:00 a 14:00 (hora de México)
//   npm run history -- --days 3
//
// Perfiles simulados (SOLO datos de prueba, no representan a ningún niño real):
//   Alumno A (tuli-toy-01): sus momentos suelen seguir a picos de ruido.
//   Alumno B (tuli-toy-02): sus momentos suelen seguir a cambios bruscos de luz y son más
//                           frecuentes al mediodía.
// También hay ruido alto SIN momentos (por ejemplo el recreo), para que la línea base sea realista.
//
// Límite: /api/ingest marca como `unsynced` lo que tenga más de 7 días, así que --days máximo es 6.

import { ingestMessage, type IngestMessage } from "../../apps/web/src/features/ingest/schemas";

const args = process.argv.slice(2);
const opt = (name: string, fallback: number) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? Number(args[i + 1]) : fallback;
};

const INGEST_URL = process.env.INGEST_URL ?? "http://localhost:3000/api/ingest";
const TOKENS = {
  "tuli-toy-01": process.env.TOY_DEVICE_TOKEN,
  "tuli-toy-02": process.env.TOY2_DEVICE_TOKEN,
  "tuli-box-01": process.env.BOX_DEVICE_TOKEN,
} as const;
if (Object.values(TOKENS).some((t) => !t)) {
  console.error("Faltan tokens en apps/web/.env.local. Corre primero: npm run provision");
  process.exit(1);
}

const DAYS = Math.min(Math.max(opt("days", 5), 1), 6);
const STEP_S = 30; // una lectura cada 30 s
const UTC_OFFSET_H = -6; // México (sin horario de verano)
const START_H = 8;
const END_H = 14;

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const chance = (p: number) => Math.random() < p;
const round1 = (n: number) => Math.round(n * 10) / 10;
const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n));

type Interval = { start: number; end: number };
const inAny = (t: number, xs: Interval[]) => xs.some((x) => t >= x.start && t <= x.end);

// Días hábiles recientes (lunes a viernes), del más antiguo al más reciente.
function schoolDays(n: number) {
  const days: Date[] = [];
  const now = new Date();
  for (let back = 0; days.length < n && back < 14; back++) {
    const d = new Date(now.getTime() - back * 86400_000);
    const localDow = new Date(d.getTime() + UTC_OFFSET_H * 3600_000).getUTCDay();
    if (localDow !== 0 && localDow !== 6) days.push(d);
  }
  return days.reverse();
}

// Instante UTC de una hora local de México en el día de `d`.
function localTime(d: Date, h: number, m = 0) {
  const local = new Date(d.getTime() + UTC_OFFSET_H * 3600_000);
  return Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate(), h - UTC_OFFSET_H, m);
}

// Eventos con proceso de Poisson simple: siguiente evento en promedio cada `meanMin` minutos.
function poisson(start: number, end: number, meanMin: number) {
  const out: number[] = [];
  let t = start + -Math.log(1 - Math.random()) * meanMin * 60_000;
  while (t < end) {
    out.push(t);
    t += -Math.log(1 - Math.random()) * meanMin * 60_000;
  }
  return out;
}

let seq = Date.now() * 1000;
const messages: { token: string; msg: IngestMessage }[] = [];
const stats = { readings: 0, pressA: 0, pressB: 0, noiseSpikes: 0, lightSwings: 0 };

const now = Date.now() - 2 * 60_000;
for (const day of schoolDays(DAYS)) {
  const start = localTime(day, START_H);
  const end = Math.min(localTime(day, END_H), now);
  if (end <= start) continue;

  // Ambiente del día
  const recess: Interval = { start: localTime(day, 10, 30), end: localTime(day, 11, 0) };
  const noise: Interval[] = poisson(start, end, 30).map((t) => ({ start: t, end: t + rand(60, 180) * 1000 }));
  const light: Interval[] = poisson(start, end, 40).map((t) => ({ start: t, end: t + rand(40, 90) * 1000 }));
  stats.noiseSpikes += noise.length;
  stats.lightSwings += light.length;

  // Momentos de Alumno A: tras un pico de ruido (55 %) y algunos al azar
  const pressesA: number[] = [];
  for (const s of noise) if (!inAny(s.start, [recess]) && chance(0.55)) pressesA.push(s.start + rand(30, 180) * 1000);
  pressesA.push(...poisson(start, end, 200));

  // Momentos de Alumno B: tras un cambio de luz (50 %), más al mediodía, y algunos al azar
  const pressesB: number[] = [];
  for (const s of light) if (chance(0.5)) pressesB.push(s.start + rand(20, 120) * 1000);
  pressesB.push(...poisson(localTime(day, 11, 30), Math.min(localTime(day, 13, 0), end), 60));
  pressesB.push(...poisson(start, end, 300));

  // Lecturas de la caja cada 30 s
  for (let t = start; t <= end; t += STEP_S * 1000) {
    const minutes = t / 60_000;
    const isNoise = inAny(t, noise);
    const isRecess = inAny(t, [recess]);
    const isLight = inAny(t, light);
    const noiseAvg = isRecess ? rand(66, 74) : isNoise ? rand(70, 80) : rand(44, 58);
    const noisePeak = isRecess ? rand(78, 90) : isNoise ? rand(84, 95) : noiseAvg + rand(2, 12);
    const lux = 600 + 80 * Math.sin(minutes / 50) + (isLight ? rand(800, 1500) : rand(-30, 30));
    messages.push({
      token: TOKENS["tuli-box-01"]!,
      msg: ingestMessage.parse({
        type: "reading",
        device_id: "tuli-box-01",
        ts: new Date(t).toISOString(),
        ts_source: "ntp",
        seq: seq++,
        window_s: STEP_S,
        noise_avg: round1(noiseAvg),
        noise_peak: round1(Math.min(noisePeak, 110)),
        light_lux: Math.round(clamp(lux, 0, 5000)),
        temp_c: round1(23 + 2.5 * Math.sin((minutes % 1440) / 200) + rand(-0.2, 0.2)),
        humidity_pct: round1(clamp(50 + 5 * Math.sin(minutes / 300) + rand(-1, 1), 0, 100)),
      }),
    });
    stats.readings++;
  }

  const press = (device: "tuli-toy-01" | "tuli-toy-02", t: number) =>
    messages.push({
      token: TOKENS[device]!,
      msg: ingestMessage.parse({ type: "press", device_id: device, ts: new Date(t).toISOString(), ts_source: "ntp", seq: seq++ }),
    });
  for (const t of pressesA) if (t >= start && t <= end) { press("tuli-toy-01", t); stats.pressA++; }
  for (const t of pressesB) if (t >= start && t <= end) { press("tuli-toy-02", t); stats.pressB++; }
}

console.log(
  `Historia de ${DAYS} día(s) hábil(es): ${stats.readings} lecturas, ${stats.pressA} momentos de Alumno A, ` +
    `${stats.pressB} de Alumno B, ${stats.noiseSpikes} picos de ruido, ${stats.lightSwings} cambios de luz. Enviando…`,
);

// Envío con concurrencia limitada (todo por /api/ingest)
let ok = 0;
let failed = 0;
let i = 0;
async function worker() {
  while (i < messages.length) {
    const { token, msg } = messages[i++];
    try {
      const res = await fetch(INGEST_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(msg),
      });
      if (res.status === 201) ok++;
      else {
        failed++;
        if (failed <= 5) console.error(`✘ ${msg.type} ${msg.device_id} → ${res.status} ${await res.text()}`);
      }
    } catch (e) {
      failed++;
      if (failed <= 5) console.error(`✘ no se pudo conectar a ${INGEST_URL}: ${(e as Error).message}`);
    }
  }
}
await Promise.all(Array.from({ length: 8 }, worker));
console.log(`${failed === 0 ? "✔" : "✘"} Enviados: ${ok} aceptados, ${failed} con error.`);
process.exit(failed === 0 ? 0 : 1);
