import { z } from "zod";

export const createTransferSchema = z.object({
  sourceWalletId: z.string().min(1),
  destinationWalletId: z.string().min(1),
  amount: z.number().positive().min(0.01),
  date: z.coerce.date(),
  description: z.string().optional(),
  categoryId: z.string().min(1),
});

export type CreateTransferDto = z.infer<typeof createTransferSchema>;

export const transferResponseSchema = z.object({
  id: z.string(),
  outTransactionId: z.string(),
  inTransactionId: z.string(),
  userId: z.string(),
  description: z.string().nullable(),
  createdAt: z.date(),
});

export type TransferResponseDto = z.infer<typeof transferResponseSchema>;
