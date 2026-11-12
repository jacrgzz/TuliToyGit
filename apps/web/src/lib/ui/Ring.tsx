// Anillo de progreso (0–100) con el valor al centro. Es decorativo: el número y el texto de al lado
// dicen lo mismo, así que el anillo va con aria-hidden. Se anima desde 0 (ver .ring en globals.css).
export function clampPct(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

// "12 %" o "12%" → 12. Si el valor no es un porcentaje, null.
export function parsePct(value: string): number | null {
  const m = /^\s*(\d+(?:[.,]\d+)?)\s*%\s*$/.exec(value);
  return m ? clampPct(Number(m[1].replace(",", "."))) : null;
}

export function Ring({ value, label, color, size = 84 }: { value: number; label: string; color?: string; size?: number }) {
  const inner = Math.round(size * 0.76);
  return (
    <div
      aria-hidden
      className="ring grid shrink-0 place-items-center rounded-full"
      style={{ width: size, height: size, ["--value" as string]: clampPct(value), ["--ring-color" as string]: color }}
    >
      <span className="grid place-items-center rounded-full bg-white text-lg font-extrabold tracking-tight" style={{ width: inner, height: inner }}>
        {label}
      </span>
    </div>
  );
}
