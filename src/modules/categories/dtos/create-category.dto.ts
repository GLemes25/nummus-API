import { z } from "zod";

export const createCategorySchema = z.object({
  name: z.string().min(1),
  color: z.string().min(1),
  icon: z.string().min(1),
  parentId: z.string().optional(),
});

export type CreateCategoryDto = z.infer<typeof createCategorySchema>;

export const categoryResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string(),
  icon: z.string(),
  parentId: z.string().nullable(),
  userId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type CategoryResponseDto = z.infer<typeof categoryResponseSchema>;
