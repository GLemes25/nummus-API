import { z } from "zod";

export const transactionBaseSchema = z.object({
  amount: z
    .number({ error: "O valor deve ser um número válido" })
    .nonnegative("O valor não pode ser negativo"),
  type: z.enum(["INCOME", "EXPENSE", "BALANCE_ADJUSTMENT"], {
    error: "O tipo da transação é inválido",
  }),
  paymentMethod: z.enum(["CASH", "PIX", "BANK_TRANSFER", "DEBIT_CARD", "CREDIT_CARD"], {
    error: "A forma de pagamento é inválida",
  }),
  date: z.coerce.date({ error: "A data informada é inválida" }),
  description: z
    .string({ error: "A descrição é obrigatória" })
    .min(1, "A descrição é obrigatória"),
  walletId: z.string().min(1, "O identificador da carteira é inválido").optional(),
  creditCardId: z.string().min(1, "O identificador do cartão de crédito é inválido").optional(),
  categoryId: z
    .string({ error: "A categoria é obrigatória" })
    .min(1, "A categoria é obrigatória"),
});

export const createTransactionSchema = transactionBaseSchema
  .refine((data) => data.paymentMethod !== "CREDIT_CARD" || !!data.creditCardId, {
    message: "O cartão de crédito é obrigatório quando a forma de pagamento é CREDIT_CARD",
  })
  .refine((data) => data.paymentMethod === "CREDIT_CARD" || !!data.walletId, {
    message: "A carteira é obrigatória para formas de pagamento que não sejam cartão de crédito",
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
  creditCardId: z.string().nullable(),
  categoryId: z.string(),
  userId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type TransactionResponseDto = z.infer<typeof transactionResponseSchema>;
