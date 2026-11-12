import { Suspense } from "react";
import { Sidebar } from "./_components/Sidebar";
import { TopBar } from "./_components/TopBar";

// Barra lateral (escritorio y tableta) o inferior (teléfono) según el rol; a la derecha, la barra
// superior (búsqueda y avisos) y el contenido.
export default function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <Suspense fallback={<div className="hidden w-16 shrink-0 border-r border-border bg-white md:block lg:w-64 print:hidden" />}>
        <Sidebar />
      </Suspense>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="mx-auto w-full max-w-6xl px-4 pt-4 md:px-8 md:pt-6 print:hidden">
          <Suspense fallback={<div className="h-[62px] rounded-2xl border border-border bg-white" />}>
            <TopBar />
          </Suspense>
        </div>
        <main className="dash-content mx-auto w-full max-w-6xl flex-1 px-4 pt-5 pb-24 md:px-8 md:pt-6 md:pb-8">{children}</main>
      </div>
    </div>
  );
}
