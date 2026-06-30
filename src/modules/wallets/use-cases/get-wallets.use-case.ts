import type { walletRepository } from "../repositories/wallet.repository.js";

type WalletRepository = typeof walletRepository;

type GetWalletsInput = {
  userId: string;
  isArchived?: boolean;
};

export const makeGetWalletsUseCase = (repository: WalletRepository) => {
  return async (data: GetWalletsInput) => {
    return repository.findManyByUser(data.userId, data.isArchived);
  };
};
