import Link from "next/link";
import { PERIODS, type Period } from "@/lib/period";

// C1: selector de periodo (7, 30 o 90 días) con ?dias=; una sola fila, encima de los análisis.
export function PeriodSelector({ current, basePath }: { current: Period; basePath: string }) {
  return (
    <nav aria-label="Periodo de análisis" className="flex gap-1 rounded-lg border border-border bg-white p-1 text-sm">
      {PERIODS.map((d) => (
        <Link
          key={d}
          href={`${basePath}?dias=${d}`}
          aria-current={d === current ? "page" : undefined}
          className={`rounded-md px-3 py-1 ${d === current ? "bg-foreground text-white" : "text-muted hover:bg-gray-50"}`}
          scroll={false}
        >
          {d} días
        </Link>
      ))}
    </nav>
  );
}
