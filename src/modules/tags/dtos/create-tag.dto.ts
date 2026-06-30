import { z } from "zod";

export const createTagSchema = z.object({
  name: z.string().min(1),
});

export type CreateTagDto = z.infer<typeof createTagSchema>;

export const tagResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  userId: z.string(),
  createdAt: z.date(),
});

export type TagResponseDto = z.infer<typeof tagResponseSchema>;
