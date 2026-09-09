import type { transactionRepository } from "../repositories/transaction.repository.js";
import type { GetTransactionsDto } from "../dtos/get-transactions.dto.js";

type TransactionRepository = typeof transactionRepository;

type GetTransactionsInput = GetTransactionsDto & { userId: string };

export const makeGetTransactionsUseCase = (repository: TransactionRepository) => {
  return async (data: GetTransactionsInput) => {
    const { userId, page, limit, month, year, search, walletId, categoryId, creditCardId, type } = data;
    let { startDate, endDate } = data;

    // month/year só definem o período quando startDate/endDate explícitos não foram enviados —
    // sem nenhum filtro de período a listagem deve continuar mostrando tudo (comportamento atual)
    if (startDate === undefined && endDate === undefined && (month !== undefined || year !== undefined)) {
      const now = new Date();
      const effectiveYear = year ?? now.getFullYear();

      if (month !== undefined) {
        startDate = new Date(effectiveYear, month - 1, 1);
        endDate = new Date(effectiveYear, month, 0, 23, 59, 59, 999); // último instante do mês (inclusivo)
      } else {
        // apenas year: cobre o ano inteiro (todas as competências daquele ano)
        startDate = new Date(effectiveYear, 0, 1);
        endDate = new Date(effectiveYear, 11, 31, 23, 59, 59, 999);
      }
    }

    const { data: transactions, totalCount } = await repository.findManyPaginated({
      userId,
      page,
      limit,
      ...(startDate !== undefined ? { startDate } : {}),
      ...(endDate !== undefined ? { endDate } : {}),
      ...(search !== undefined ? { search } : {}),
      ...(walletId !== undefined ? { walletId } : {}),
      ...(categoryId !== undefined ? { categoryId } : {}),
      ...(creditCardId !== undefined ? { creditCardId } : {}),
      ...(type !== undefined ? { type } : {}),
    });

    return {
      data: transactions,
      meta: {
        totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  };
};
