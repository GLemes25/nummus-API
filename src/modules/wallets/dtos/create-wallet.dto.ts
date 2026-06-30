import { z } from "zod";

export const createWalletSchema = z.object({
  name: z.string().min(1),
  currency: z.string().default("BRL"),
  initialBalance: z.number().default(0),
});

export type CreateWalletDto = z.infer<typeof createWalletSchema>;

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
