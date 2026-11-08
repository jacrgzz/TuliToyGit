import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { connection } from "next/server";

// Cliente para servidor (paginas, server actions) con la sesion del usuario.
// Respeta RLS: cada usuario solo ve lo suyo.
export async function createClient() {
  const cookieStore = await cookies();
  // El cliente de Supabase usa Date.now() (expiración del token). Con Cache Components y
  // Partial Prefetching eso no puede ocurrir al prerenderizar: se espera a la petición real.
  await connection();
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
