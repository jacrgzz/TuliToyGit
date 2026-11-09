import { LogOut } from "lucide-react";
import Link from "next/link";
import { signOut } from "@/features/auth/actions";
import { getViewerRole } from "@/features/auth/queries";
import { demoEnabled } from "@/features/ingest/demo";
import { createClient } from "@/lib/supabase/server";
import { navItemsFor } from "./nav-items";
import { SidebarNav } from "./SidebarNav";

// Lee cookies (rol y correo): usar dentro de <Suspense>.
export async function Sidebar() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  const role = await getViewerRole();

  const account = (
    <div className="space-y-2 text-sm">
      {demoEnabled() && (
        <Link href="/demo" className="block text-muted hover:underline">
          Modo demo
        </Link>
      )}
      <p className="truncate text-muted" title={data.user.email ?? undefined}>
        {data.user.email}
      </p>
      <form action={signOut}>
        <button type="submit" className="flex w-full items-center gap-2 rounded-lg border border-border bg-white px-3 py-1.5 hover:bg-gray-50">
          <LogOut aria-hidden className="h-4 w-4" />
          Salir
        </button>
      </form>
    </div>
  );

  const compactAccount = (
    <form action={signOut}>
      <button type="submit" title="Salir" aria-label="Salir" className="rounded-lg border border-border bg-white p-2 hover:bg-gray-50">
        <LogOut aria-hidden className="h-5 w-5" />
      </button>
    </form>
  );

  return <SidebarNav items={navItemsFor(role)} account={account} compactAccount={compactAccount} badge={role === "admin" ? "Admin · solo lectura" : undefined} />;
}
