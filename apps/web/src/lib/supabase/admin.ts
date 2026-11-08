import "server-only";
import { createClient } from "@supabase/supabase-js";

// Cliente con service_role: SALTA RLS. Solo se usa en features/ingest (servidor).
// Nunca importarlo desde componentes de cliente ni desde otras features.
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("Falta SUPABASE_SERVICE_ROLE_KEY en .env.local");
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
