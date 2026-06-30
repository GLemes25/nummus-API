import { z } from "zod";

export const createTransactionSchema = z.object({
  amount: z.number().nonnegative(),
  type: z.enum(["INCOME", "EXPENSE", "BALANCE_ADJUSTMENT"]),
  paymentMethod: z.enum(["CASH", "PIX", "BANK_TRANSFER", "DEBIT_CARD"]),
  date: z.coerce.date(),
  description: z.string().min(1),
  walletId: z.string().min(1),
  categoryId: z.string().min(1),
});

export type CreateTransactionDto = z.infer<typeof createTransactionSchema>;

export const transactionResponseSchema = z.object({
  id: z.string(),
  amount: z.number(),
  type: z.enum(["INCOME", "EXPENSE", "BALANCE_ADJUSTMENT"]),
  paymentMethod: z.enum(["CASH", "PIX", "BANK_TRANSFER", "DEBIT_CARD", "CREDIT_CARD"]),
  status: z.enum(["PENDING", "COMPLETED", "CANCELLED"]),
  date: z.date(),
  description: z.string(),
  walletId: z.string().nullable(),
  categoryId: z.string(),
  userId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type TransactionResponseDto = z.infer<typeof transactionResponseSchema>;
