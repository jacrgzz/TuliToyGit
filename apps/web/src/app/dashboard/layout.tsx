import Link from "next/link";
import { Suspense } from "react";
import { UserMenu } from "@/features/auth/components/UserMenu";
import { demoEnabled } from "@/features/ingest/demo";

export default function DashboardLayout({
  children,
}: LayoutProps<"/dashboard">) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-border bg-white print:hidden">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-3">
          <Link href="/dashboard" className="text-xl font-bold text-brand">
            Tuli
          </Link>
          <div className="flex items-center gap-3">
            {demoEnabled() && (
              <Link href="/demo" className="text-sm text-muted hover:underline">
                Modo demo
              </Link>
            )}
            <Suspense fallback={null}>
              <UserMenu />
            </Suspense>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
        {children}
      </main>
    </div>
  );
}
