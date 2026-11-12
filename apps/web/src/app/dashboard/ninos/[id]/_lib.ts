import { notFound } from "next/navigation";
import { requireUser } from "@/features/auth/queries";
import { getChild } from "@/features/children/queries";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Carga común de las pestañas de un niño: exige sesión, valida el id y, si el usuario no puede
// ver al niño, RLS devuelve null y se responde 404 (no se revela que existe).
export async function loadChild(params: Promise<{ id: string }>) {
  await requireUser();
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const child = await getChild(id);
  if (!child) notFound();
  return child;
}
