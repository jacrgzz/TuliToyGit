import { LogOut } from "lucide-react";
import Link from "next/link";
import { signOut } from "@/features/auth/actions";
import { getViewerRole } from "@/features/auth/queries";
import { demoEnabled } from "@/features/ingest/demo";
import { InstallButton } from "@/features/pwa/components/InstallButton";
import { createClient } from "@/lib/supabase/server";
import { chooseClassroom } from "./actions";
import { navItemsFor } from "./nav-items";
import { getSelectedRoom } from "./room";
import { SidebarNav } from "./SidebarNav";

// Lee cookies (rol y correo): usar dentro de <Suspense>.
export async function Sidebar() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  const role = await getViewerRole();
  // Selector de salón: solo para docentes con 2 salones o más.
  const picker = role === "teacher" ? await getSelectedRoom() : null;
  const showPicker = !!picker && picker.rooms.length > 1 && !!picker.selected;

  const account = (
    <div className="space-y-2 text-sm">
      {demoEnabled() && (
        <Link href="/demo" className="block text-muted hover:underline">
          Modo demo
        </Link>
      )}
      <div className="flex items-center gap-2">
        <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#ffd9ec] text-xs font-semibold uppercase">
          {(data.user.email ?? "?").slice(0, 2)}
        </span>
        <p className="truncate text-muted" title={data.user.email ?? undefined}>
          {data.user.email}
        </p>
      </div>
      <InstallButton />
      <form action={signOut}>
        <button type="submit" className="flex w-full items-center gap-2 rounded-xl border border-border bg-white px-3 py-1.5 hover:bg-tint">
          <LogOut aria-hidden className="h-4 w-4" />
          Salir
        </button>
      </form>
    </div>
  );

  const compactAccount = (
    <form action={signOut}>
      <button type="submit" title="Salir" aria-label="Salir" className="rounded-xl border border-border bg-white p-2 hover:bg-tint">
        <LogOut aria-hidden className="h-5 w-5" />
      </button>
    </form>
  );

  return (
    <SidebarNav
      items={navItemsFor(role)}
      account={account}
      compactAccount={compactAccount}
      badge={role === "admin" ? "Admin · solo lectura" : undefined}
      rooms={showPicker ? picker!.rooms : undefined}
      selectedRoomId={showPicker ? picker!.selected!.id : undefined}
      chooseRoom={showPicker ? chooseClassroom : undefined}
    />
  );
}
