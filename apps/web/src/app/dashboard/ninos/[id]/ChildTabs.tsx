"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ChildTab } from "../../_components/nav-items";

// Pestañas del niño: cada una es una subruta (/dashboard/ninos/[id]/<pestaña>). Dependen del rol.
export function ChildTabs({ childId, tabs }: { childId: string; tabs: { slug: ChildTab; label: string }[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Secciones del niño" className="-mx-4 overflow-x-auto px-4 print:hidden">
      <ul className="flex min-w-max gap-1 border-b border-border">
        {tabs.map((t) => {
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
