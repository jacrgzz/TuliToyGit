import { createBrowserClient } from "@supabase/ssr";

// Cliente para componentes de cliente. Usa la clave publica; la seguridad la da RLS.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
