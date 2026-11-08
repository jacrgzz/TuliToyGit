import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { requireUser } from "@/features/auth/queries";
import { DemoPanel } from "@/features/ingest/components/DemoPanel";
import { demoEnabled } from "@/features/ingest/demo";

async function DemoView() {
  // Sin DEMO_MODE=true la página no existe (en producción real debe estar apagado).
  if (!demoEnabled()) notFound();
  await requireUser();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard" className="text-sm text-muted hover:underline">
          ← Volver al panel
        </Link>
        <h1 className="mt-1 text-2xl font-bold">Modo demo</h1>
        <p className="text-sm text-muted">
          Usa este teléfono como juguete y como caja del salón. Solo datos simulados;
          necesitas una cuenta vinculada al niño y al salón de demostración.
        </p>
      </div>
      <DemoPanel />
    </div>
  );
}

export default function DemoPage() {
  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-4 py-6">
      <Suspense fallback={<p className="text-muted">Cargando…</p>}>
        <DemoView />
      </Suspense>
    </main>
  );
}
