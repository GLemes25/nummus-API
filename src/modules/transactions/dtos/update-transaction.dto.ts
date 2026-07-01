import type { z } from "zod";

import { transactionBaseSchema } from "./create-transaction.dto.js";

export const updateTransactionSchema = transactionBaseSchema.partial();

export type UpdateTransactionDto = z.infer<typeof updateTransactionSchema>;
