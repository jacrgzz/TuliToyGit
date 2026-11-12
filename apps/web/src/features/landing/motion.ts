// Cuentas puras de la animación de la landing (hero → grid con el scroll). p = avance 0..1.

/** Interpolación suave (smoothstep) de x entre a y b, acotada a 0..1. */
export function smooth(a: number, b: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/** Cuánto se abre el grid: espacio, margen y esquinas (0 = una sola tarjeta, 1 = bento). */
export const gridOpen = (p: number) => smooth(0.05, 0.7, p);
/** Cuánto se ha ido el hero (menú, título y botones). */
export const heroFade = (p: number) => smooth(0, 0.4, p);
/** La cámara se aleja hasta mostrar al osito completo. */
export const bearReveal = (p: number) => smooth(0, 0.3, p);
/** El osito se desvanece. */
export const bearFade = (p: number) => smooth(0.2, 0.45, p);
/** Color de la tarjeta i, en ola. */
export const tileTint = (i: number, p: number) => smooth(0.25 + i * 0.05, 0.65 + i * 0.04, p);
/** Contenido de la tarjeta i, después de su color. */
export const tileContent = (i: number, p: number) => smooth(0.55 + i * 0.03, 0.9 + i * 0.01, p);

/** Avance del scroll dentro del contenedor alto: 0 arriba, 1 al terminar el recorrido. */
export function scrollProgress(top: number, wrapHeight: number, stageHeight: number) {
  const span = Math.max(1, wrapHeight - stageHeight);
  return Math.min(1, Math.max(0, -top / span));
}

/** Tiempo máximo de la pantalla de carga: después se abre aunque el osito no haya cargado. */
export const LOADING_TIMEOUT_MS = 6000;
