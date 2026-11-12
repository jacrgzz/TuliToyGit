import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Refresca la sesión de Supabase en cada petición y protege /dashboard, /demo y /pantalla.
// Lo usa src/proxy.ts. La autorización real de los datos sigue siendo RLS.
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (items) => {
          items.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          items.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const { data } = await supabase.auth.getClaims();
  const signedIn = !!data?.claims;
  const path = request.nextUrl.pathname;

  const redirectTo = (to: string) => {
    const redirect = NextResponse.redirect(new URL(to, request.url));
    // Conservar las cookies de sesión refrescadas
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    return redirect;
  };

  const protectedPath = ["/dashboard", "/demo", "/pantalla"].some((p) => path.startsWith(p));
  if (!signedIn && protectedPath) return redirectTo("/login");
  if (signedIn && path === "/login") return redirectTo("/dashboard");

  return response;
}
