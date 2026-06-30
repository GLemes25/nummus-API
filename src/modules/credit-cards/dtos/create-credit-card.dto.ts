import { z } from "zod";

export const createCreditCardSchema = z.object({
  name: z.string().min(1),
  limit: z.number().positive(),
  closingDay: z.number().int().min(1).max(28),
  dueDay: z.number().int().min(1).max(28),
});

export type CreateCreditCardDto = z.infer<typeof createCreditCardSchema>;

export const creditCardResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  limit: z.number(),
  closingDay: z.number(),
  dueDay: z.number(),
  userId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type CreditCardResponseDto = z.infer<typeof creditCardResponseSchema>;
