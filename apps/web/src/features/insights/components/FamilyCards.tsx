// Tarjetas de la vista de la familia. El color del borde es decorativo: todo lo importante va en texto.
// Ningún estado usa rojo; "más veces que de costumbre" no es algo malo.
export type FamilyCardData = {
  title: string;
  value?: string;
  sentence: string;
  detail?: string;
  tone: "calm" | "info" | "nodata";
};

const TONE_CLASS: Record<FamilyCardData["tone"], string> = {
  calm: "border-l-calm",
  info: "border-l-series-1",
  nodata: "border-l-border",
};

export function FamilyCards({ cards, label }: { cards: FamilyCardData[]; label: string }) {
  return (
    <ul aria-label={label} className="grid gap-3 md:grid-cols-3">
      {cards.map((c) => (
        <li key={c.title} className={`flex flex-col rounded-xl border border-l-4 border-border bg-white p-4 ${TONE_CLASS[c.tone]}`}>
          <p className="text-sm text-muted">{c.title}</p>
          {c.value && <p className="mt-1 text-3xl font-bold">{c.value}</p>}
          <p className={`mt-2 ${c.tone === "nodata" ? "text-muted" : ""}`}>{c.sentence}</p>
          {c.detail && <p className="mt-auto pt-2 text-xs text-muted">{c.detail}</p>}
        </li>
      ))}
    </ul>
  );
}
