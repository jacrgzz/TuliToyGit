"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { getViewerRole, requireUser } from "@/features/auth/queries";
import { listMyClassrooms } from "@/features/children/queries";
import { ROOM_COOKIE } from "./room";

// Cambia el salón que ve el docente. Se valida en el servidor: solo salones que RLS deja ver.
export async function chooseClassroom(formData: FormData) {
  await requireUser();
  if ((await getViewerRole()) !== "teacher") return;
  const id = String(formData.get("id") ?? "");
  const rooms = await listMyClassrooms();
  if (!rooms.some((r) => r.id === id)) return;
  (await cookies()).set(ROOM_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  revalidatePath("/dashboard", "layout");
}
