import { z } from "zod";
import { isLocalInput, localInputToUtcISO } from "@/lib/time-mx";

export const ACTIVITY_KINDS = ["examen", "recreo", "musica", "lectura", "cambio", "otra"] as const;
export type ActivityKind = (typeof ACTIVITY_KINDS)[number];

export const ACTIVITY_LABEL: Record<ActivityKind, string> = {
  examen: "Examen",
  recreo: "Recreo",
  musica: "Música",
  lectura: "Lectura",
  cambio: "Cambio de actividad o de salón",
  otra: "Otra",
};

// Entrada del formulario (horas locales de México). La base exige fin > inicio y máximo 12 h.
export const activityInput = z
  .object({
    classroomId: z.uuid(),
    kind: z.enum(ACTIVITY_KINDS),
    name: z.string().trim().min(1, "Escribe un nombre").max(80, "Máximo 80 caracteres"),
    starts: z.string().refine(isLocalInput, "Fecha y hora de inicio inválidas"),
    ends: z.string().refine(isLocalInput, "Fecha y hora de fin inválidas"),
  })
  .refine((v) => new Date(localInputToUtcISO(v.ends)) > new Date(localInputToUtcISO(v.starts)), {
    message: "El fin debe ser después del inicio",
    path: ["ends"],
  })
  .refine(
    (v) => new Date(localInputToUtcISO(v.ends)).getTime() - new Date(localInputToUtcISO(v.starts)).getTime() <= 12 * 3600_000,
    { message: "Una actividad dura máximo 12 horas", path: ["ends"] },
  );

export type ActivityInput = z.infer<typeof activityInput>;
