import { randomUUID } from "crypto";
import { makeAppError } from "../../../shared/errors/make-app-error.js";
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

export const computeInvoicePeriod = (date: Date, closingDay: number, dueDay: number) => {
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

// Adiciona N meses a uma data sem pular dias incorretamente (ex: Jan 31 + 1 mês = Feb 28, não Mar 3)
const addMonths = (date: Date, months: number): Date => {
  const d = new Date(date.getFullYear(), date.getMonth() + months, date.getDate());
  if (d.getDate() !== date.getDate()) {
    d.setDate(0); // último dia do mês correto
  }
  return d;
};

const roundCents = (value: number) => Math.round(value * 100) / 100;

export const makeCreateTransactionUseCase = (
  repository: TransactionRepository,
  findWallet: FindWallet,
  findCategory: FindCategory,
  findCreditCard: FindCreditCard
) => {
  return async (data: CreateTransactionInput) => {
    if (data.categoryId) {
      const category = await findCategory(data.categoryId);
      if (!category) {
        throw makeAppError({
          code: "CATEGORY_NOT_FOUND",
          message: "Categoria não encontrada",
          statusCode: 404,
        });
      }
    }

    const installments = data.installments ?? 1;
    const installmentAmount = roundCents(data.amount / installments);
    const installmentId = installments > 1 ? randomUUID() : undefined;
    const initialStatus = data.status ?? "COMPLETED";

    if (data.paymentMethod === "CREDIT") {
      const creditCard = await findCreditCard(data.creditCardId!);
      if (!creditCard) {
        throw makeAppError({
          code: "CREDIT_CARD_NOT_FOUND",
          message: "Cartão de crédito não encontrado",
          statusCode: 404,
        });
      }

      if (installments > 1) {
        const installmentItems = Array.from({ length: installments }, (_, i) => {
          // A data nominal da compra avança mês a mês; o closingDay do cartão decide em qual
          // fatura cada parcela "ensaca" — a parcela nunca fica na data da compra, e sim na
          // data de fechamento da fatura em que ela efetivamente cai
          const installmentDate = addMonths(data.date, i);
          const { periodStart, periodEnd, dueDate } = computeInvoicePeriod(
            installmentDate,
            creditCard.closingDay,
            creditCard.dueDay
          );
          // Última parcela absorve os centavos residuais
          const amount =
            i === installments - 1
              ? roundCents(data.amount - installmentAmount * (installments - 1))
              : installmentAmount;

          return {
            amount,
            type: data.type,
            status: i === 0 ? initialStatus : "PENDING",
            date: periodEnd,
            description: `${data.description} (${i + 1}/${installments})`,
            creditCardId: data.creditCardId!,
            categoryId: data.categoryId ?? null,
            userId: data.userId,
            installmentId: installmentId!,
            installmentNumber: i + 1,
            periodStart,
            periodEnd,
            dueDate,
          };
        });

        return repository.createManyCreditInstallments(installmentItems);
      }

      const { periodStart, periodEnd, dueDate } = computeInvoicePeriod(
        data.date,
        creditCard.closingDay,
        creditCard.dueDay
      );

      // A competência da transação é a data de fechamento da fatura do ciclo em que a compra
      // cai (não a data exata da compra), para não poluir o extrato do mês corrente quando a
      // compra ocorre após o closingDay e pertence à fatura seguinte
      return repository.createWithInvoiceUpdate({
        amount: data.amount,
        type: data.type,
        status: initialStatus,
        date: periodEnd,
        description: data.description,
        creditCardId: data.creditCardId!,
        categoryId: data.categoryId ?? null,
        userId: data.userId,
        periodStart,
        periodEnd,
        dueDate,
      });
    }

    const wallet = await findWallet(data.walletId!);
    if (!wallet) {
      throw makeAppError({
        code: "WALLET_NOT_FOUND",
        message: "Carteira não encontrada",
        statusCode: 404,
      });
    }

    const currentBalance = wallet.balance.toNumber();

    if (installments > 1) {
      // Apenas a primeira parcela afeta o saldo imediatamente; as demais são compromissos futuros
      let firstInstallmentNewBalance: number;
      if (data.type === "INCOME") {
        firstInstallmentNewBalance = currentBalance + installmentAmount;
      } else if (data.type === "EXPENSE") {
        firstInstallmentNewBalance = currentBalance - installmentAmount;
      } else {
        firstInstallmentNewBalance = data.amount;
      }

      const installmentItems = Array.from({ length: installments }, (_, i) => {
        const amount =
          i === installments - 1
            ? roundCents(data.amount - installmentAmount * (installments - 1))
            : installmentAmount;

        return {
          amount,
          type: data.type,
          paymentMethod: data.paymentMethod as Exclude<typeof data.paymentMethod, "CREDIT">,
          status: i === 0 ? initialStatus : "PENDING",
          date: addMonths(data.date, i),
          description: `${data.description} (${i + 1}/${installments})`,
          walletId: data.walletId!,
          categoryId: data.categoryId ?? null,
          userId: data.userId,
          installmentId: installmentId!,
          installmentNumber: i + 1,
        };
      });

      return repository.createManyWalletInstallments(
        installmentItems,
        data.walletId!,
        firstInstallmentNewBalance
      );
    }

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
      status: initialStatus,
      date: data.date,
      description: data.description,
      walletId: data.walletId!,
      categoryId: data.categoryId ?? null,
      userId: data.userId,
      newBalance,
    });
  };
};
