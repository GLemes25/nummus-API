import { z } from "zod";

export const createTransactionSchema = z
  .object({
    amount: z.number().nonnegative(),
    type: z.enum(["INCOME", "EXPENSE", "BALANCE_ADJUSTMENT"]),
    paymentMethod: z.enum(["CASH", "PIX", "BANK_TRANSFER", "DEBIT_CARD", "CREDIT_CARD"]),
    date: z.coerce.date(),
    description: z.string().min(1),
    walletId: z.string().min(1).optional(),
    creditCardId: z.string().min(1).optional(),
    categoryId: z.string().min(1),
  })
  .refine(
    (data) => data.paymentMethod !== "CREDIT_CARD" || !!data.creditCardId,
    { message: "creditCardId is required when paymentMethod is CREDIT_CARD" }
  )
  .refine(
    (data) => data.paymentMethod === "CREDIT_CARD" || !!data.walletId,
    { message: "walletId is required for non-credit-card payment methods" }
  );

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
  creditCardId: z.string().nullable(),
  categoryId: z.string(),
  userId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type TransactionResponseDto = z.infer<typeof transactionResponseSchema>;
