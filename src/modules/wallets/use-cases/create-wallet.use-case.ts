import type { walletRepository } from "../repositories/wallet.repository.js";
import type { CreateWalletDto } from "../dtos/create-wallet.dto.js";

type WalletRepository = typeof walletRepository;

type CreateWalletInput = CreateWalletDto & { userId: string };

export const makeCreateWalletUseCase = (repository: WalletRepository) => {
  return async (data: CreateWalletInput) => {
    if (data.initialBalance < 0) {
      throw new Error("Initial balance cannot be negative");
    }

    return repository.create(data);
  };
};
