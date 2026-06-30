import type { Transfer } from "@prisma/client";

import type { TransferResponseDto } from "../../dtos/create-transfer.dto.js";

export const presentTransfer = (transfer: Transfer): TransferResponseDto => ({
  id: transfer.id,
  outTransactionId: transfer.outTransactionId,
  inTransactionId: transfer.inTransactionId,
  userId: transfer.userId,
  description: transfer.description,
  createdAt: transfer.createdAt,
});
