import { faker } from "@faker-js/faker";

type WalletInput = {
  name: string;
  currency: string;
  initialBalance: number;
  userId: string;
};

export const makeFakeWallet = (overrides: Partial<WalletInput> = {}): WalletInput => ({
  name: faker.finance.accountName(),
  currency: "BRL",
  initialBalance: faker.number.float({ min: 0, max: 10000, fractionDigits: 2 }),
  userId: faker.string.uuid(),
  ...overrides,
});
