import { makeAppError } from "../../../shared/errors/make-app-error.js";
import type { creditCardRepository } from "../repositories/credit-card.repository.js";

type CreditCardRepository = typeof creditCardRepository;
type WalletSnapshot = { balance: { toNumber: () => number }; userId: string };
type FindWallet = (id: string) => Promise<WalletSnapshot | null>;
type CategorySnapshot = { id: string };
type FindCategoryBySystemId = (
  userId: string,
  systemId: string,
) => Promise<CategorySnapshot | null>;
type CreateSystemCategory = (data: {
  userId: string;
  systemId: string;
  name: string;
  icon: string;
  color: string;
}) => Promise<CategorySnapshot>;

const CREDIT_CARD_PAYMENT_SYSTEM_ID = "CREDIT_CARD_PAYMENT";

type PayInvoiceInput = {
  creditCardId: string;
  invoiceId: string;
  walletId: string;
  userId: string;
  transactionIds?: string[];
  amount?: number;
};

export const makePayInvoiceUseCase = (
  repository: CreditCardRepository,
  findWallet: FindWallet,
  findCategoryBySystemId: FindCategoryBySystemId,
  createSystemCategory: CreateSystemCategory,
) => {
  return async ({ creditCardId, invoiceId, walletId, userId, transactionIds, amount }: PayInvoiceInput) => {
    const creditCard = await repository.findById(creditCardId);

    if (!creditCard) {
      throw makeAppError({
        code: "CREDIT_CARD_NOT_FOUND",
        message: "Cartão de crédito não encontrado",
        statusCode: 404,
      });
    }

    if (creditCard.userId !== userId) {
      throw makeAppError({
        code: "CREDIT_CARD_ACCESS_DENIED",
        message: "Você não tem permissão para pagar a fatura deste cartão",
        statusCode: 403,
      });
    }

    const wallet = await findWallet(walletId);

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
        message: "Você não tem permissão para usar esta carteira",
        statusCode: 403,
      });
    }

    const invoice = await repository.findInvoiceById(invoiceId);

    if (!invoice) {
      throw makeAppError({
        code: "INVOICE_NOT_FOUND",
        message: "Fatura não encontrada",
        statusCode: 404,
      });
    }

    if (invoice.creditCardId !== creditCardId) {
      throw makeAppError({
        code: "INVOICE_CARD_MISMATCH",
        message: "Esta fatura não pertence ao cartão informado",
        statusCode: 403,
      });
    }

    const remainingAmount = Number(invoice.totalAmount) - Number(invoice.paidAmount);

    if (invoice.paid || remainingAmount <= 0) {
      throw makeAppError({
        code: "INVOICE_ALREADY_PAID",
        message: "Esta fatura já foi quitada",
        statusCode: 400,
      });
    }

    let amountToPay: number;
    let itemizedTransactionIds: string[] | undefined;

    if (transactionIds && transactionIds.length > 0) {
      const transactions = await repository.findInvoiceTransactionsByIds(invoiceId, transactionIds);

      if (transactions.length !== transactionIds.length) {
        throw makeAppError({
          code: "INVOICE_TRANSACTION_NOT_FOUND",
          message: "Uma ou mais transações informadas não pertencem a esta fatura ou já foram pagas",
          statusCode: 404,
        });
      }

      amountToPay = transactions.reduce((sum, transaction) => sum + Number(transaction.amount), 0);
      itemizedTransactionIds = transactionIds;
    } else {
      amountToPay = amount ?? remainingAmount;
    }

    if (amountToPay > remainingAmount) {
      throw makeAppError({
        code: "PAYMENT_EXCEEDS_INVOICE_BALANCE",
        message: "O valor do pagamento excede o saldo devedor da fatura",
        statusCode: 400,
      });
    }

    const category =
      (await findCategoryBySystemId(userId, CREDIT_CARD_PAYMENT_SYSTEM_ID)) ??
      (await createSystemCategory({
        userId,
        systemId: CREDIT_CARD_PAYMENT_SYSTEM_ID,
        name: "Pagamento de Fatura",
        icon: "credit-card",
        color: "#64748B",
      }));

    await repository.payInvoice({
      invoiceId,
      walletId,
      amount: amountToPay,
      userId,
      categoryId: category.id,
      ...(itemizedTransactionIds !== undefined ? { transactionIds: itemizedTransactionIds } : {}),
    });
  };
};
