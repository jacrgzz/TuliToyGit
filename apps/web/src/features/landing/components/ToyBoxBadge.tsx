/** Cubo isométrico con la marca (diseño de Angel Cervantes). */
export function ToyBoxBadge() {
  return (
    <svg viewBox="0 0 48 48" className="size-11 sm:size-14" aria-hidden>
      <path d="M10 14 24 7l14 7-14 7Z" fill="#7b6fd6" />
      <path d="M38 14v20l-14 7V21Z" fill="#4b3fa6" />
      <path d="M10 14l14 7v20L10 34Z" fill="#e8492c" />
      <text x="17" y="28" textAnchor="middle" fontSize="6" fontWeight="800" fill="#fff" transform="skewY(26) translate(0 -8)">
        TULI
      </text>
      <text x="17" y="35" textAnchor="middle" fontSize="6" fontWeight="800" fill="#fff" transform="skewY(26) translate(0 -8)">
        TOY
      </text>
    </svg>
  );
}
