import { Suspense } from "react";
import { Sidebar } from "./_components/Sidebar";

// Barra lateral (escritorio y tableta) o inferior (teléfono) según el rol, y el contenido a la derecha.
export default function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <Suspense fallback={<div className="hidden w-16 shrink-0 border-r border-border bg-white md:block lg:w-60 print:hidden" />}>
        <Sidebar />
      </Suspense>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 pb-24 md:pb-6">{children}</main>
    </div>
  );
}
