// Sonidos sintetizados con WebAudio: sin archivos, sin descargas. El contexto nace con el primer gesto.
let ctx: AudioContext | null = null;

function ac(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    ctx ??= new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(c: AudioContext, type: OscillatorType, f0: number, f1: number, dur: number, vol: number, delay = 0) {
  const t = c.currentTime + delay;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

/** Chillido de juguete: dos barridos de tono que suben y bajan. */
export function playSqueak() {
  const c = ac();
  if (!c) return;
  tone(c, 'triangle', 520, 980, 0.11, 0.16);
  tone(c, 'sine', 980, 640, 0.14, 0.12, 0.09);
}

/** Pop suave de burbuja. */
export function playPop() {
  const c = ac();
  if (!c) return;
  tone(c, 'sine', 300, 90, 0.09, 0.2);
}

/** Boing de peluche al soltar: tono que tiembla y baja. */
export function playBoing() {
  const c = ac();
  if (!c) return;
  const t = c.currentTime;
  const o = c.createOscillator();
  const lfo = c.createOscillator();
  const lfoGain = c.createGain();
  const g = c.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(330, t);
  o.frequency.exponentialRampToValueAtTime(140, t + 0.45);
  lfo.frequency.setValueAtTime(18, t);
  lfoGain.gain.setValueAtTime(40, t);
  lfoGain.gain.exponentialRampToValueAtTime(1, t + 0.45);
  lfo.connect(lfoGain).connect(o.frequency);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.18, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
  o.connect(g).connect(c.destination);
  o.start(t);
  lfo.start(t);
  o.stop(t + 0.52);
  lfo.stop(t + 0.52);
}
