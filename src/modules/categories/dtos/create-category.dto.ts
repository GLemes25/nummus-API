import { z } from "zod";

export const createCategorySchema = z.object({
  name: z
    .string({ error: "O nome da categoria é obrigatório" })
    .min(1, "O nome da categoria é obrigatório"),
  color: z
    .string({ error: "A cor da categoria é obrigatória" })
    .min(1, "A cor da categoria é obrigatória"),
  icon: z
    .string({ error: "O ícone da categoria é obrigatório" })
    .min(1, "O ícone da categoria é obrigatório"),
  parentId: z.string({ error: "O identificador da categoria pai é inválido" }).optional(),
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
