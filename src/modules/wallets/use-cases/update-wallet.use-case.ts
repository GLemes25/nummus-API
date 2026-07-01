import { makeAppError } from "../../../shared/errors/make-app-error.js";
import type { walletRepository } from "../repositories/wallet.repository.js";
import type { UpdateWalletDto } from "../dtos/update-wallet.dto.js";

type WalletRepository = typeof walletRepository;

type UpdateWalletInput = {
  walletId: string;
  userId: string;
  data: UpdateWalletDto;
};

export const makeUpdateWalletUseCase = (repository: WalletRepository) => {
  return async ({ walletId, userId, data }: UpdateWalletInput) => {
    const wallet = await repository.findById(walletId);

    if (!wallet) {
      throw makeAppError({
        code: "WALLET_NOT_FOUND",
        message: "Carteira não encontrada",
        statusCode: 404,
      });
    }

    if (wallet.userId !== userId) {
      throw makeAppError({
        code: "WALLET_ACCESS_DENIED",
        message: "Você não tem permissão para editar esta carteira",
        statusCode: 403,
      });
    }

    if (data.name !== undefined && data.name !== wallet.name) {
      const existing = await repository.findByNameAndUser(userId, data.name);
      if (existing) {
        throw makeAppError({
          code: "WALLET_ALREADY_EXISTS",
          message: "Já existe uma carteira com este nome",
          statusCode: 409,
        });
      }
    }

    return repository.update(walletId, data);
  };
};
