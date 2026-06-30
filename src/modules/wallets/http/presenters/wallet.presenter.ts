import type { Wallet } from "@prisma/client";

import type { WalletResponseDto } from "../../dtos/create-wallet.dto.js";

export const presentWallet = (wallet: Wallet): WalletResponseDto => ({
  id: wallet.id,
  name: wallet.name,
  currency: wallet.currency,
  initialBalance: Number(wallet.initialBalance),
  balance: Number(wallet.balance),
  isArchived: wallet.isArchived,
  userId: wallet.userId,
  createdAt: wallet.createdAt,
  updatedAt: wallet.updatedAt,
});
