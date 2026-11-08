import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Cliente para servidor (paginas, server actions) con la sesion del usuario.
// Respeta RLS: cada usuario solo ve lo suyo.
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (items) => {
          try {
            items.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Llamado desde un Server Component: se ignora; el proxy refresca la sesion.
          }
        },
      },
    },
  );
}
