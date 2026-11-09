import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { getChild } from "@/features/children/queries";
import { LiveRefresh } from "@/features/events/components/LiveRefresh";
import { ChildTabs } from "./ChildTabs";

// Un id inválido o de otra persona da null: la página de cada pestaña responde 404.
async function Header({ params }: { params: LayoutProps<"/dashboard/ninos/[id]">["params"] }) {
  const { id } = await params;
  const ok = /^[0-9a-f-]{36}$/i.test(id);
  const child = ok ? await getChild(id) : null;
  if (!child) return null;
  return (
    <div className="space-y-3 print:hidden">
      <Link href="/dashboard/ninos" className="inline-flex items-center gap-1 text-sm text-muted hover:underline">
        <ArrowLeft aria-hidden className="h-4 w-4" />
        Niños
      </Link>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{child.display_name}</h1>
        <LiveRefresh />
      </div>
      <ChildTabs childId={child.id} />
    </div>
  );
}

export default function ChildLayout({ children, params }: LayoutProps<"/dashboard/ninos/[id]">) {
  return (
    <div className="space-y-6">
      <Suspense fallback={<div className="h-24" />}>
        <Header params={params} />
      </Suspense>
      {children}
    </div>
  );
}
