"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CHILD_TABS } from "../../_components/nav-items";

// Pestañas del niño: cada una es una subruta (/dashboard/ninos/[id]/<pestaña>).
export function ChildTabs({ childId }: { childId: string }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Secciones del niño" className="-mx-4 overflow-x-auto px-4 print:hidden">
      <ul className="flex min-w-max gap-1 border-b border-border">
        {CHILD_TABS.map((t) => {
          const href = `/dashboard/ninos/${childId}/${t.slug}`;
          const active = pathname === href || pathname.startsWith(`${href}/`) || pathname.startsWith(`${href}.`);
          return (
            <li key={t.slug}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`-mb-px block border-b-2 px-4 py-2 text-sm font-medium ${
                  active ? "border-brand text-brand" : "border-transparent text-muted hover:text-foreground"
                }`}
              >
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
