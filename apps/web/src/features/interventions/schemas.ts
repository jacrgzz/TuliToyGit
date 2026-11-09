import { z } from "zod";

export const interventionInput = z.object({
  childId: z.uuid(),
  title: z.string().trim().min(1, "Escribe qué cambió").max(80, "Máximo 80 caracteres"),
  startedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
  note: z.string().trim().max(300, "Máximo 300 caracteres"),
});

export type InterventionInput = z.infer<typeof interventionInput>;
