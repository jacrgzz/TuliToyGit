import Link from "next/link";
import { Suspense } from "react";
import { GoogleButton } from "@/features/auth/components/GoogleButton";
import { DemoLoginForm } from "@/features/auth/components/DemoLoginForm";

// searchParams es un dato de la petición: se lee dentro de <Suspense>.
async function OAuthError({
  searchParams,
}: {
  searchParams: PageProps<"/login">["searchParams"];
}) {
  const { error } = await searchParams;
  if (error !== "oauth") return null;
  return (
    <p role="alert" className="mb-4 rounded-lg bg-high/10 p-3 text-sm text-high">
      No se pudo completar el acceso con Google. Intenta de nuevo.
    </p>
  );
}

export default function LoginPage(props: PageProps<"/login">) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10">
      <Link href="/" className="mb-6 text-xl font-bold text-brand">
        Tuli
      </Link>
      <h1 className="text-2xl font-bold">Iniciar sesión</h1>
      <p className="mt-1 text-muted">Para madres, padres, tutores y docentes.</p>

      <div className="mt-6">
        <Suspense>
          <OAuthError searchParams={props.searchParams} />
        </Suspense>
        <GoogleButton />
      </div>

      <p className="mt-4 text-xs text-muted">
        Al continuar confirmas que eres madre, padre, tutor o docente, y que
        cuentas con el consentimiento del tutor para registrar los momentos de
        uso del juguete. Tuli no es un dispositivo médico ni ofrece
        diagnósticos. (Borrador: el aviso de privacidad completo está
        pendiente.)
      </p>

      <details className="mt-8 card">
        <summary className="cursor-pointer text-sm font-medium">
          Cuentas de demostración (datos simulados)
        </summary>
        <DemoLoginForm />
      </details>
    </main>
  );
}
