import { z } from "zod";

export const eventNoteInput = z.object({
  eventId: z.number().int().positive(),
  note: z.string().trim().max(500, "Máximo 500 caracteres"),
  accidental: z.boolean(),
});

export type EventNoteInput = z.infer<typeof eventNoteInput>;
