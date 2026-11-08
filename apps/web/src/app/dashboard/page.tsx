import { Suspense } from "react";
import { getViewerRole, requireUser } from "@/features/auth/queries";
import { listMyChildren } from "@/features/children/queries";

// Provisional del Día 3: confirma sesión, rol y niños visibles (RLS). El Día 4 lo reemplaza.
async function DashboardHome() {
  const user = await requireUser();
  const [role, children] = await Promise.all([getViewerRole(), listMyChildren()]);

  return (
    <div>
      <h1 className="text-2xl font-bold">
        {role === "teacher" ? "Panel del salón" : "Panel de mi hijo o hija"}
      </h1>
      <p className="mt-1 text-sm text-muted">Sesión: {user.email}</p>

      {children.length === 0 ? (
        <p className="mt-6 rounded-xl border border-border bg-white p-4">
          Todavía no tienes niños vinculados a tu cuenta. Pide a quien
          administra Tuli que vincule tu cuenta.
        </p>
      ) : (
        <ul className="mt-6 space-y-2">
          {children.map((c) => (
            <li
              key={c.id}
              className="rounded-xl border border-border bg-white p-4"
            >
              {c.display_name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<p className="text-muted">Cargando…</p>}>
      <DashboardHome />
    </Suspense>
  );
}
