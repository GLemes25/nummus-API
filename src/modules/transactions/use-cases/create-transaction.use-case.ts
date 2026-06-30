import type { transactionRepository } from "../repositories/transaction.repository.js";
import type { CreateTransactionDto } from "../dtos/create-transaction.dto.js";

type TransactionRepository = typeof transactionRepository;
type WalletWithBalance = { balance: { toNumber: () => number } };
type CategoryExistence = { id: string };
type FindWallet = (id: string) => Promise<WalletWithBalance | null>;
type FindCategory = (id: string) => Promise<CategoryExistence | null>;

type CreateTransactionInput = CreateTransactionDto & { userId: string };

export const makeCreateTransactionUseCase = (
  repository: TransactionRepository,
  findWallet: FindWallet,
  findCategory: FindCategory
) => {
  return async (data: CreateTransactionInput) => {
    const wallet = await findWallet(data.walletId);
    if (!wallet) throw new Error("Wallet not found");

    const category = await findCategory(data.categoryId);
    if (!category) throw new Error("Category not found");

    const currentBalance = wallet.balance.toNumber();
    let storedAmount: number;
    let newBalance: number;

    if (data.type === "INCOME") {
      storedAmount = data.amount;
      newBalance = currentBalance + data.amount;
    } else if (data.type === "EXPENSE") {
      storedAmount = data.amount;
      newBalance = currentBalance - data.amount;
    } else {
      storedAmount = data.amount - currentBalance;
      newBalance = data.amount;
    }

    return repository.createWithBalanceUpdate({
      storedAmount,
      type: data.type,
      paymentMethod: data.paymentMethod,
      date: data.date,
      description: data.description,
      walletId: data.walletId,
      categoryId: data.categoryId,
      userId: data.userId,
      newBalance,
    });
  };
};
