import { makeAppError } from "../../../shared/errors/make-app-error.js";
import type { creditCardRepository } from "../repositories/credit-card.repository.js";

type CreditCardRepository = typeof creditCardRepository;

type ReopenInvoiceInput = {
  invoiceId: string;
  userId: string;
};

export const makeReopenInvoiceUseCase = (repository: CreditCardRepository) => {
  return async ({ invoiceId, userId }: ReopenInvoiceInput) => {
    const invoice = await repository.findInvoiceById(invoiceId);

    if (!invoice) {
      throw makeAppError({
        code: "INVOICE_NOT_FOUND",
        message: "Fatura não encontrada",
        statusCode: 404,
      });
    }

    const creditCard = await repository.findById(invoice.creditCardId);

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
        message: "Você não tem permissão para gerenciar esta fatura",
        statusCode: 403,
      });
    }

    if (Number(invoice.paidAmount) <= 0) {
      throw makeAppError({
        code: "INVOICE_NOT_PAID",
        message: "Esta fatura ainda não possui pagamentos para estornar",
        statusCode: 400,
      });
    }

    await repository.reopenInvoice(invoiceId);
  };
};
