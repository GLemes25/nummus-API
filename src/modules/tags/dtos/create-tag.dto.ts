import { z } from "zod";

export const createTagSchema = z.object({
  name: z
    .string({ error: "O nome da tag é obrigatório" })
    .min(1, "O nome da tag é obrigatório"),
});

export type CreateTagDto = z.infer<typeof createTagSchema>;

export const tagResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  userId: z.string(),
  createdAt: z.date(),
});

export type TagResponseDto = z.infer<typeof tagResponseSchema>;
