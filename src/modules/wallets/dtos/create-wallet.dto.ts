import { z } from "zod";

export const createWalletSchema = z.object({
  name: z.string().min(1),
  currency: z.string().default("BRL"),
  initialBalance: z.number().default(0),
});

export type CreateWalletDto = z.infer<typeof createWalletSchema>;
