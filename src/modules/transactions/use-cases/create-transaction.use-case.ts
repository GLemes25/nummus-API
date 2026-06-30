import type { transactionRepository } from "../repositories/transaction.repository.js";
import type { CreateTransactionDto } from "../dtos/create-transaction.dto.js";

type TransactionRepository = typeof transactionRepository;
type WalletWithBalance = { balance: { toNumber: () => number } };
type CategoryExistence = { id: string };
type CreditCardSnapshot = { id: string; closingDay: number; dueDay: number };
type FindWallet = (id: string) => Promise<WalletWithBalance | null>;
type FindCategory = (id: string) => Promise<CategoryExistence | null>;
type FindCreditCard = (id: string) => Promise<CreditCardSnapshot | null>;

type CreateTransactionInput = CreateTransactionDto & { userId: string };

const computeInvoicePeriod = (date: Date, closingDay: number, dueDay: number) => {
  const day = date.getDate();
  const month = date.getMonth();
  const year = date.getFullYear();

  if (day <= closingDay) {
    return {
      periodStart: new Date(year, month - 1, closingDay + 1),
      periodEnd: new Date(year, month, closingDay),
      dueDate: new Date(year, month + 1, dueDay),
    };
  }

  return {
    periodStart: new Date(year, month, closingDay + 1),
    periodEnd: new Date(year, month + 1, closingDay),
    dueDate: new Date(year, month + 2, dueDay),
  };
};

export const makeCreateTransactionUseCase = (
  repository: TransactionRepository,
  findWallet: FindWallet,
  findCategory: FindCategory,
  findCreditCard: FindCreditCard
) => {
  return async (data: CreateTransactionInput) => {
    const category = await findCategory(data.categoryId);
    if (!category) throw new Error("Category not found");

    if (data.paymentMethod === "CREDIT_CARD") {
      const creditCard = await findCreditCard(data.creditCardId!);
      if (!creditCard) throw new Error("Credit card not found");

      const { periodStart, periodEnd, dueDate } = computeInvoicePeriod(
        data.date,
        creditCard.closingDay,
        creditCard.dueDay
      );

      return repository.createWithInvoiceUpdate({
        amount: data.amount,
        type: data.type,
        date: data.date,
        description: data.description,
        creditCardId: data.creditCardId!,
        categoryId: data.categoryId,
        userId: data.userId,
        periodStart,
        periodEnd,
        dueDate,
      });
    }

    const wallet = await findWallet(data.walletId!);
    if (!wallet) throw new Error("Wallet not found");

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
      walletId: data.walletId!,
      categoryId: data.categoryId,
      userId: data.userId,
      newBalance,
    });
  };
};
