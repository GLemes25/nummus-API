import { z } from "zod";

export const createTransferSchema = z.object({
  sourceWalletId: z
    .string({ error: "A carteira de origem é obrigatória" })
    .min(1, "A carteira de origem é obrigatória"),
  destinationWalletId: z
    .string({ error: "A carteira de destino é obrigatória" })
    .min(1, "A carteira de destino é obrigatória"),
  amount: z
    .number({ error: "O valor deve ser um número válido" })
    .positive("O valor deve ser maior que zero")
    .min(0.01, "O valor mínimo é 0,01"),
  date: z.coerce.date({ error: "A data informada é inválida" }),
  description: z.string().optional(),
  categoryId: z
    .string({ error: "A categoria é obrigatória" })
    .min(1, "A categoria é obrigatória"),
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
