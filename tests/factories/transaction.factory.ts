import { faker } from "@faker-js/faker";

type TransactionType = "INCOME" | "EXPENSE" | "BALANCE_ADJUSTMENT";
type PaymentMethod = "CASH" | "PIX" | "BANK_TRANSFER" | "DEBIT_CARD";

type TransactionInput = {
  amount: number;
  type: TransactionType;
  paymentMethod: PaymentMethod;
  date: Date;
  description: string;
  walletId: string;
  categoryId: string;
  userId: string;
};

export const makeFakeTransaction = (overrides: Partial<TransactionInput> = {}): TransactionInput => ({
  amount: faker.number.float({ min: 1, max: 5000, fractionDigits: 2 }),
  type: "EXPENSE",
  paymentMethod: "CASH",
  date: faker.date.recent(),
  description: faker.finance.transactionDescription(),
  walletId: faker.string.uuid(),
  categoryId: faker.string.uuid(),
  userId: faker.string.uuid(),
  ...overrides,
});
