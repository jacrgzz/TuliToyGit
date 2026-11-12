/**
 * Estado compartido entre el DOM (HeroGrid) y la escena R3F sin pasar por React:
 * reveal 0..1 = cuánto se ha alejado la cámara para mostrar al osito completo al hacer scroll.
 */
export const ositoView = { reveal: 0 };

/** ¿El navegador puede dibujar WebGL? Si no, la landing se abre sin osito. */
export function hasWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") ?? c.getContext("webgl"));
  } catch {
    return false;
  }
}
