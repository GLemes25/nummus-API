import { PaymentMethod, TransactionStatus } from "@prisma/client";
import { z } from "zod";

export const transactionBaseSchema = z.object({
  amount: z
    .number({ error: "O valor deve ser um número válido" })
    .nonnegative("O valor não pode ser negativo"),
  type: z.enum(["INCOME", "EXPENSE", "BALANCE_ADJUSTMENT"], {
    error: "O tipo da transação é inválido",
  }),
  paymentMethod: z.nativeEnum(PaymentMethod, {
    error: "A forma de pagamento é inválida",
  }),
  date: z.coerce.date({ error: "A data informada é inválida" }),
  description: z
    .string({ error: "A descrição é obrigatória" })
    .min(1, "A descrição é obrigatória"),
  walletId: z.string().min(1, "O identificador da carteira é inválido").optional(),
  creditCardId: z.string().min(1, "O identificador do cartão de crédito é inválido").optional(),
  categoryId: z.string().min(1, "O identificador da categoria é inválido").optional(),
  installments: z.number().int().min(1).default(1).optional(),
});

export const createTransactionSchema = transactionBaseSchema
  .extend({
    status: z.nativeEnum(TransactionStatus, { error: "O status da transação é inválido" }).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.paymentMethod === PaymentMethod.CREDIT) {
      if (!data.creditCardId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["creditCardId"],
          message: "O cartão de crédito é obrigatório quando a forma de pagamento é CREDIT",
        });
      }
      if (data.walletId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["walletId"],
          message: "Uma transação de cartão de crédito não pode estar vinculada a uma carteira",
        });
      }
    } else {
      if (!data.walletId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["walletId"],
          message: "A carteira é obrigatória para formas de pagamento que não sejam cartão de crédito",
        });
      }
      if (data.creditCardId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["creditCardId"],
          message: "Uma transação de carteira não pode estar vinculada a um cartão de crédito",
        });
      }
    }
  });

export type CreateTransactionDto = z.infer<typeof createTransactionSchema>;

export const transactionResponseSchema = z.object({
  id: z.string(),
  amount: z.number(),
  type: z.enum(["INCOME", "EXPENSE", "BALANCE_ADJUSTMENT"]),
  paymentMethod: z.nativeEnum(PaymentMethod),
  status: z.enum(["PENDING", "COMPLETED", "CANCELLED"]),
  date: z.date(),
  description: z.string(),
  walletId: z.string().nullable(),
  creditCardId: z.string().nullable(),
  invoiceId: z.string().nullable(),
  installmentId: z.string().nullable(),
  installmentNumber: z.number().int().nullable(),
  categoryId: z.string().nullable(),
  userId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type TransactionResponseDto = z.infer<typeof transactionResponseSchema>;
