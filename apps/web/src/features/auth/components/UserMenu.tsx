import { createClient } from "@/lib/supabase/server";
import { signOut } from "../actions";

// Componente asíncrono: lee cookies, por eso debe usarse dentro de <Suspense>.
export async function UserMenu() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;

  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="hidden text-muted sm:inline">{data.user.email}</span>
      <form action={signOut}>
        <button
          type="submit"
          className="rounded-lg border border-border bg-white px-3 py-1.5 hover:bg-gray-50"
        >
          Salir
        </button>
      </form>
    </div>
  );
}
