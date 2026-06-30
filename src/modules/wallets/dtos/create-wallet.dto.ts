import { z } from "zod";

export const createWalletSchema = z.object({
  name: z
    .string({ error: "O nome da carteira é obrigatório" })
    .min(1, "O nome da carteira é obrigatório"),
  currency: z.string({ error: "A moeda deve ser um texto válido" }).default("BRL"),
  initialBalance: z.number({ error: "O saldo inicial deve ser um número válido" }).default(0),
});

export type CreateWalletDto = z.infer<typeof createWalletSchema>;

export const getWalletsSchema = z.object({
  isArchived: z
    .enum(["true", "false"], { error: "O filtro isArchived deve ser 'true' ou 'false'" })
    .transform((v) => v === "true")
    .optional(),
});

export type GetWalletsDto = z.infer<typeof getWalletsSchema>;

export const walletResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  currency: z.string(),
  initialBalance: z.number(),
  balance: z.number(),
  isArchived: z.boolean(),
  userId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type WalletResponseDto = z.infer<typeof walletResponseSchema>;
