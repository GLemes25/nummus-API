import { z } from "zod";

export const payInvoiceSchema = z.object({
  invoiceId: z
    .string({ error: "A fatura é obrigatória" })
    .min(1, "A fatura é obrigatória"),
  walletId: z
    .string({ error: "A carteira é obrigatória" })
    .min(1, "A carteira é obrigatória"),
  transactionIds: z.array(z.string().min(1)).optional(),
  amount: z.number().positive("O valor deve ser maior que zero").optional(),
});

export type PayInvoiceDto = z.infer<typeof payInvoiceSchema>;
