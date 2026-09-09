import { PaymentMethod } from "@prisma/client";
import { z } from "zod";

export const getTransactionsSchema = z
  .object({
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
    month: z.coerce.number().int().min(1).max(12).optional(),
    year: z.coerce.number().int().min(2000).max(2100).optional(),
    startDate: z.coerce.date({ error: "A data inicial é inválida" }).optional(),
    endDate: z.coerce.date({ error: "A data final é inválida" }).optional(),
    search: z.string().optional(),
    walletId: z.string().optional(),
    categoryId: z.string().optional(),
    creditCardId: z.string().optional(),
    type: z
      .enum(["INCOME", "EXPENSE", "BALANCE_ADJUSTMENT"], {
        error: "O tipo da transação é inválido",
      })
      .optional(),
  })
  .refine((data) => (data.startDate === undefined) === (data.endDate === undefined), {
    message: "startDate e endDate devem ser enviados juntos",
    path: ["endDate"],
  })
  .refine((data) => !data.startDate || !data.endDate || data.startDate <= data.endDate, {
    message: "startDate deve ser menor ou igual a endDate",
    path: ["endDate"],
  });

export type GetTransactionsDto = z.infer<typeof getTransactionsSchema>;

export const transactionListItemSchema = z.object({
  id: z.string(),
  amount: z.number(),
  type: z.enum(["INCOME", "EXPENSE", "BALANCE_ADJUSTMENT"]),
  paymentMethod: z.nativeEnum(PaymentMethod),
  status: z.enum(["PENDING", "COMPLETED", "CANCELLED"]),
  date: z.date(),
  description: z.string(),
  walletId: z.string().nullable(),
  creditCardId: z.string().nullable(),
  categoryId: z.string().nullable(),
  userId: z.string(),
  installmentId: z.string().nullable(),
  installmentNumber: z.number().int().nullable(),
  paidAt: z.date().nullable(),
  paidByTransactionId: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  category: z
    .object({
      id: z.string(),
      name: z.string(),
      color: z.string(),
      icon: z.string(),
    })
    .nullable(),
  wallet: z
    .object({
      id: z.string(),
      name: z.string(),
      currency: z.string(),
    })
    .nullable(),
  invoice: z
    .object({
      id: z.string(),
      periodStartDate: z.date(),
      periodEndDate: z.date(),
      dueDate: z.date(),
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
