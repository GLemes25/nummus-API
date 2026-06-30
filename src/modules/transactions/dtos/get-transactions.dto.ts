import { z } from "zod";

export const getTransactionsSchema = z.object({
  page: z.coerce
    .number({ error: "A página deve ser um número válido" })
    .int("A página deve ser um número inteiro")
    .positive("A página deve ser maior que zero")
    .default(1),
  limit: z.coerce
    .number({ error: "O limite deve ser um número válido" })
    .int("O limite deve ser um número inteiro")
    .positive("O limite deve ser maior que zero")
    .max(100, "O limite máximo é 100")
    .default(20),
  startDate: z.coerce.date({ error: "A data inicial é inválida" }).optional(),
  endDate: z.coerce.date({ error: "A data final é inválida" }).optional(),
  walletId: z.string().optional(),
  categoryId: z.string().optional(),
  type: z
    .enum(["INCOME", "EXPENSE", "BALANCE_ADJUSTMENT"], {
      error: "O tipo da transação é inválido",
    })
    .optional(),
});

export type GetTransactionsDto = z.infer<typeof getTransactionsSchema>;

export const transactionListItemSchema = z.object({
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
  category: z.object({
    id: z.string(),
    name: z.string(),
    color: z.string(),
    icon: z.string(),
  }),
  wallet: z
    .object({
      id: z.string(),
      name: z.string(),
      currency: z.string(),
    })
    .nullable(),
});

export type TransactionListItemDto = z.infer<typeof transactionListItemSchema>;

export const getTransactionsResponseSchema = z.object({
  data: z.array(transactionListItemSchema),
  meta: z.object({
    totalCount: z.number(),
    page: z.number(),
    limit: z.number(),
    totalPages: z.number(),
  }),
});

export type GetTransactionsResponseDto = z.infer<typeof getTransactionsResponseSchema>;
