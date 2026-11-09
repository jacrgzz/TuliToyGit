import { Download, FileText } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { requireUser } from "@/features/auth/queries";
import { PeriodSelector } from "@/features/insights/components/PeriodSelector";
import { parsePeriod } from "@/lib/period";
import { visibleChildren } from "../_components/room";

async function Reports({ searchParams }: { searchParams: PageProps<"/dashboard/reportes">["searchParams"] }) {
  const [, sp] = await Promise.all([requireUser(), searchParams]);
  const days = parsePeriod(sp.dias);
  const { kids } = await visibleChildren();
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Reportes</h1>
        <PeriodSelector current={days} basePath="/dashboard/reportes" />
      </div>
      <p className="text-sm text-muted">
        Un reporte por niño para compartir con la familia o con especialistas. Resume coincidencias; no es un diagnóstico.
      </p>
      {kids.length === 0 ? (
        <p className="rounded-xl border border-border bg-white p-4 text-muted">Todavía no hay niños vinculados a tu cuenta.</p>
      ) : (
        <ul className="space-y-2">
          {kids.map((k) => (
            <li key={k.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-white p-4">
              <p className="font-semibold">{k.display_name}</p>
              <div className="flex gap-2 text-sm">
                <Link href={`/dashboard/ninos/${k.id}/reporte?dias=${days}`} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 font-medium hover:bg-gray-50">
                  <FileText aria-hidden className="h-4 w-4" />
                  Ver reporte
                </Link>
                <a href={`/dashboard/ninos/${k.id}/reporte.csv?dias=${days}`} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 font-medium hover:bg-gray-50">
                  <Download aria-hidden className="h-4 w-4" />
                  CSV
                </a>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function ReportesPage(props: PageProps<"/dashboard/reportes">) {
  return (
    <Suspense fallback={<p className="text-muted">Cargando…</p>}>
      <Reports searchParams={props.searchParams} />
    </Suspense>
  );
}
