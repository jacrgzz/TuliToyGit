import { DOW_LABEL } from "../patterns";
import type { WeekDay } from "../family";

// Días de esta semana con las veces que usó el juguete. Un día sin lecturas dice "sin datos" (no cero).
export function WeekDays({ days }: { days: WeekDay[] }) {
  const max = Math.max(1, ...days.map((d) => d.events ?? 0));
  return (
    <ul aria-label="Veces por día de esta semana" className="space-y-2">
      {days.map((d) => (
        <li key={d.day} className="grid grid-cols-[3rem_1fr_5rem] items-center gap-3 text-sm">
          <span className="font-medium">{DOW_LABEL[d.dow - 1]}</span>
          <span className="h-3 rounded-full bg-tint" aria-hidden>
            {d.events !== null && d.events > 0 && (
              <span className="block h-3 rounded-full bg-series-1" style={{ width: `${(d.events / max) * 100}%` }} />
            )}
          </span>
          <span className={`text-right ${d.events === null ? "text-muted" : ""}`}>
            {d.events === null ? "sin datos" : `${d.events} ${d.events === 1 ? "vez" : "veces"}`}
          </span>
        </li>
      ))}
    </ul>
  );
}
