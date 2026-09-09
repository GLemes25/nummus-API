import type { metricsRepository } from "../repositories/metrics.repository.js";

type MetricsRepository = typeof metricsRepository;

type GetMonthlySummaryInput = {
  userId: string;
  month?: number;
  year?: number;
  startDate?: Date;
  endDate?: Date;
};

export const makeGetMonthlySummaryUseCase = (repository: MetricsRepository) => {
  return async (input: GetMonthlySummaryInput) => {
    let from: Date;
    let to: Date;

    if (input.startDate && input.endDate) {
      from = input.startDate;
      to = input.endDate;
    } else {
      const now = new Date();
      const month = input.month ?? now.getMonth() + 1;
      const year = input.year ?? now.getFullYear();

      from = new Date(year, month - 1, 1);
      to = new Date(year, month, 0, 23, 59, 59, 999); // último instante do mês (inclusivo)
    }

    const transactions = await repository.findIncomeAndExpenseByPeriod(input.userId, from, to);

    let totalIncome = 0;
    let totalExpense = 0;

    for (const tx of transactions) {
      if (tx.type === "INCOME") {
        totalIncome += Number(tx.amount);
      } else if (tx.type === "EXPENSE") {
        totalExpense += Number(tx.amount);
      }
    }

    totalIncome = Math.round(totalIncome * 100) / 100;
    totalExpense = Math.round(totalExpense * 100) / 100;

    return {
      totalIncome,
      totalExpense,
      balance: Math.round((totalIncome - totalExpense) * 100) / 100,
    };
  };
};
