"use client";

import {
  ClipboardList,
  Cpu,
  CircleHelp,
  Ellipsis,
  FileText,
  House,
  Monitor,
  School,
  Users,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { InstallButton } from "@/features/pwa/components/InstallButton";
import { ClassroomPicker } from "./ClassroomPicker";
import { isActive, type NavIcon, type NavItem } from "./nav-items";

const ICONS: Record<NavIcon, LucideIcon> = {
  house: House,
  school: School,
  users: Users,
  zap: Zap,
  clipboard: ClipboardList,
  file: FileText,
  cpu: Cpu,
  monitor: Monitor,
  help: CircleHelp,
};

const MOBILE_SLOTS = 4;

// Enlaces que abren otra pestaña (p. ej. la pantalla del salón).
const newTabProps = (item: NavItem) => (item.newTab ? ({ target: "_blank", rel: "noopener" } as const) : {});

// Barra lateral (escritorio y tableta) y barra inferior (teléfono). Es un componente de cliente
// solo para marcar la sección activa con usePathname; el resto lo arma el servidor.
export function SidebarNav({
  items,
  account,
  compactAccount,
  badge,
  rooms,
  selectedRoomId,
  chooseRoom,
}: {
  items: NavItem[];
  account: React.ReactNode;
  // Cuenta en tableta (barra de solo íconos): solo el botón de salir.
  compactAccount: React.ReactNode;
  badge?: string;
  // Selector de salón (docente con 2 salones o más).
  rooms?: { id: string; name: string }[];
  selectedRoomId?: string;
  chooseRoom?: (formData: FormData) => void | Promise<void>;
}) {
  const picker = rooms && selectedRoomId && chooseRoom ? { rooms, selectedId: selectedRoomId, action: chooseRoom } : null;
  const pathname = usePathname();
  const [more, setMore] = useState(false);
  const bar = items.slice(0, MOBILE_SLOTS);
  const rest = items.slice(MOBILE_SLOTS);
  const moreActive = rest.some((i) => isActive(pathname, i));

  return (
    <>
      {/* Escritorio: barra fija con texto. Tableta: solo íconos. */}
      <aside className="sticky top-0 hidden h-screen w-16 shrink-0 flex-col border-r border-border bg-white md:flex lg:w-64 print:hidden">
        <Link href="/dashboard" className="flex h-16 items-center justify-center gap-3 lg:justify-start lg:px-5">
          <span aria-hidden className="grid h-10 w-10 place-items-center rounded-xl bg-brand text-lg font-extrabold text-white">
            T
          </span>
          <span className="hidden text-lg font-extrabold lg:inline">Tuli</span>
          <span className="sr-only lg:hidden">Tuli</span>
        </Link>
        {picker && (
          <div className="hidden px-4 pb-2 lg:block">
            <ClassroomPicker {...picker} />
          </div>
        )}
        <nav aria-label="Secciones" className="flex-1 space-y-1 overflow-y-auto px-2 py-2 lg:px-3">
          {items.map((item) => {
            const Icon = ICONS[item.icon];
            const active = isActive(pathname, item);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                aria-current={active ? "page" : undefined}
                {...newTabProps(item)}
                className={`flex items-center justify-center gap-3 rounded-xl px-3 py-2.5 text-sm lg:justify-start ${
                  active ? "bg-tint font-semibold text-brand-dark" : "font-medium text-foreground hover:bg-surface-soft"
                }`}
              >
                <Icon aria-hidden className="h-5 w-5 shrink-0" />
                <span className="hidden lg:inline">{item.label}</span>
                <span className="sr-only lg:hidden">{item.label}</span>
                {item.newTab && <span className="sr-only"> (se abre en otra pestaña)</span>}
              </Link>
            );
          })}
        </nav>
        <div className="flex flex-col items-center gap-2 border-t border-border p-3 lg:hidden">
          {picker && <ClassroomPicker {...picker} variant="icon" />}
          {compactAccount}
        </div>
        <div className="hidden p-3 lg:block">
          <div className="rounded-2xl bg-surface-soft p-3">
            {badge && (
              <span className="mb-2 inline-block rounded-full bg-tint px-2.5 py-0.5 text-xs font-semibold text-brand-dark">{badge}</span>
            )}
            {account}
          </div>
        </div>
      </aside>

      {/* Teléfono: barra superior mínima y barra inferior con 4 secciones y "Más". */}
      <header className="flex h-12 items-center justify-between border-b border-border bg-white px-4 md:hidden print:hidden">
        <Link href="/dashboard" className="flex items-center gap-2 text-lg font-extrabold">
          <span aria-hidden className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-sm text-white">
            T
          </span>
          Tuli
        </Link>
        <div className="flex items-center gap-2">
          {badge && <span className="rounded-full bg-tint px-2.5 py-0.5 text-xs font-semibold text-brand-dark">{badge}</span>}
          <InstallButton variant="chip" />
        </div>
      </header>
      <nav
        aria-label="Secciones"
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-border bg-white pb-[env(safe-area-inset-bottom)] md:hidden print:hidden"
      >
        {bar.map((item) => {
          const Icon = ICONS[item.icon];
          const active = isActive(pathname, item);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              {...newTabProps(item)}
              className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${active ? "text-brand" : "text-muted"}`}
            >
              <Icon aria-hidden className="h-5 w-5" />
              <span className="max-w-full truncate px-1">{item.short ?? item.label}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMore(true)}
          aria-haspopup="dialog"
          aria-expanded={more}
          className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${moreActive ? "text-brand" : "text-muted"}`}
        >
          <Ellipsis aria-hidden className="h-5 w-5" />
          Más
        </button>
      </nav>
      {more && (
        <div className="fixed inset-0 z-40 md:hidden print:hidden" role="dialog" aria-modal="true" aria-label="Más secciones">
          <button type="button" aria-label="Cerrar" className="absolute inset-0 bg-black/30" onClick={() => setMore(false)} />
          <div className="absolute inset-x-0 bottom-0 rounded-t-2xl border-t border-border bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <div className="mb-2 flex items-center justify-between">
              <p className="font-semibold">Más</p>
              <button type="button" onClick={() => setMore(false)} aria-label="Cerrar" className="rounded-lg p-2 hover:bg-tint">
                <X aria-hidden className="h-5 w-5" />
              </button>
            </div>
            {picker && (
              <div className="mb-3">
                <ClassroomPicker {...picker} />
              </div>
            )}
            <ul className="space-y-1">
              {rest.map((item) => {
                const Icon = ICONS[item.icon];
                const active = isActive(pathname, item);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setMore(false)}
                      aria-current={active ? "page" : undefined}
                      {...newTabProps(item)}
                      className={`flex items-center gap-3 rounded-lg px-3 py-3 font-medium ${active ? "bg-tint text-brand-dark" : "hover:bg-tint"}`}
                    >
                      <Icon aria-hidden className="h-5 w-5" />
                      {item.label}
                      {item.newTab && <span className="sr-only"> (se abre en otra pestaña)</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
            <div className="mt-3 border-t border-border pt-3">{account}</div>
          </div>
        </div>
      )}
    </>
  );
}
