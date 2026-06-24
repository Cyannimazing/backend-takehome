import { z } from "zod";

export const createNoteSchema = z.object({
  group_id: z.coerce.number().int().positive(),
  body: z.string().trim().min(1).max(10_000),
});

export type CreateNotePayload = z.infer<typeof createNoteSchema>;

export const deleteNoteSchema = z.object({
  id: z.string().uuid(),
});

export type DeleteNotePayload = z.infer<typeof deleteNoteSchema>;
