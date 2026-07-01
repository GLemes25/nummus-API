import type { z } from "zod";

import { createWalletSchema } from "./create-wallet.dto.js";

export const updateWalletSchema = createWalletSchema.partial();

export type UpdateWalletDto = z.infer<typeof updateWalletSchema>;
