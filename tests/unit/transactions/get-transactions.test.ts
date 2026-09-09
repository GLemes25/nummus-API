import { describe, it, expect, beforeEach } from "vitest";
import { faker } from "@faker-js/faker";
import { makeGetTransactionsUseCase } from "../../../src/modules/transactions/use-cases/get-transactions.use-case.js";
import { makeCreateTransactionUseCase } from "../../../src/modules/transactions/use-cases/create-transaction.use-case.js";
import { makeInMemoryTransactionRepository } from "../../repositories/in-memory-transaction.repository.js";
import { makeInMemoryWalletRepository } from "../../repositories/in-memory-wallet.repository.js";
import { makeInMemoryCategoryRepository } from "../../repositories/in-memory-category.repository.js";

describe("makeGetTransactionsUseCase", () => {
  let walletRepo: ReturnType<typeof makeInMemoryWalletRepository>;
  let transactionRepo: ReturnType<typeof makeInMemoryTransactionRepository>;
  let getTransactions: ReturnType<typeof makeGetTransactionsUseCase>;

  const makeCreditCardTx = (userId: string, creditCardId: string) =>
    transactionRepo.createWithInvoiceUpdate({
      amount: 100,
      type: "EXPENSE",
      date: new Date(),
      description: "test",
      creditCardId,
      categoryId: faker.string.uuid(),
      userId,
      periodStart: new Date(),
      periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

  beforeEach(() => {
    walletRepo = makeInMemoryWalletRepository();
    transactionRepo = makeInMemoryTransactionRepository(walletRepo.items);
    getTransactions = makeGetTransactionsUseCase(transactionRepo as any);
  });

  it("should return all transactions for the user", async () => {
    // Arrange
    const userId = faker.string.uuid();
    const anotherUserId = faker.string.uuid();
    await makeCreditCardTx(userId, faker.string.uuid());
    await makeCreditCardTx(userId, faker.string.uuid());
    await makeCreditCardTx(anotherUserId, faker.string.uuid());

    // Act
    const result = await getTransactions({ userId, page: 1, limit: 20 });

    // Assert
    expect(result.data).toHaveLength(2);
    expect(result.meta.totalCount).toBe(2);
  });

  it("should filter transactions by creditCardId", async () => {
    // Arrange
    const userId = faker.string.uuid();
    const firstCardId = faker.string.uuid();
    const secondCardId = faker.string.uuid();
    const firstTx = await makeCreditCardTx(userId, firstCardId);
    await makeCreditCardTx(userId, secondCardId);
    await makeCreditCardTx(userId, faker.string.uuid());

    // Act
    const result = await getTransactions({ userId, page: 1, limit: 20, creditCardId: firstCardId });

    // Assert
    expect(result.data).toHaveLength(1);
    expect(result.meta.totalCount).toBe(1);
    expect(result.data[0]!.id).toBe(firstTx.id);
    expect(result.data[0]!.creditCardId).toBe(firstCardId);
  });

  it("should not return deleted transactions", async () => {
    // Arrange
    const userId = faker.string.uuid();
    const cardId = faker.string.uuid();
    await makeCreditCardTx(userId, cardId);
    transactionRepo.items[0]!.deletedAt = new Date();

    // Act
    const result = await getTransactions({ userId, page: 1, limit: 20, creditCardId: cardId });

    // Assert
    expect(result.data).toHaveLength(0);
    expect(result.meta.totalCount).toBe(0);
  });

  it("should filter transactions by walletId", async () => {
    // Arrange
    const userId = faker.string.uuid();
    const targetWalletId = faker.string.uuid();
    const otherWalletId = faker.string.uuid();

    await transactionRepo.createWithBalanceUpdate({
      storedAmount: 100,
      type: "INCOME",
      paymentMethod: "CASH",
      date: new Date(),
      description: "target",
      walletId: targetWalletId,
      categoryId: faker.string.uuid(),
      userId,
      newBalance: 100,
    });
    await transactionRepo.createWithBalanceUpdate({
      storedAmount: 50,
      type: "EXPENSE",
      paymentMethod: "CASH",
      date: new Date(),
      description: "other",
      walletId: otherWalletId,
      categoryId: faker.string.uuid(),
      userId,
      newBalance: 50,
    });

    // Act
    const result = await getTransactions({ userId, page: 1, limit: 20, walletId: targetWalletId });

    // Assert
    expect(result.data).toHaveLength(1);
    expect(result.data[0]!.walletId).toBe(targetWalletId);
  });

  it("should filter transactions by type", async () => {
    // Arrange
    const userId = faker.string.uuid();
    const walletId = faker.string.uuid();

    await transactionRepo.createWithBalanceUpdate({
      storedAmount: 500,
      type: "INCOME",
      paymentMethod: "CASH",
      date: new Date(),
      description: "income",
      walletId,
      categoryId: faker.string.uuid(),
      userId,
      newBalance: 500,
    });
    await transactionRepo.createWithBalanceUpdate({
      storedAmount: 100,
      type: "EXPENSE",
      paymentMethod: "CASH",
      date: new Date(),
      description: "expense",
      walletId,
      categoryId: faker.string.uuid(),
      userId,
      newBalance: 400,
    });

    // Act
    const result = await getTransactions({ userId, page: 1, limit: 20, type: "INCOME" });

    // Assert
    expect(result.data).toHaveLength(1);
    expect(result.data[0]!.type).toBe("INCOME");
  });

  it("should filter transactions by categoryId", async () => {
    // Arrange
    const userId = faker.string.uuid();
    const targetCategoryId = faker.string.uuid();
    const otherCategoryId = faker.string.uuid();
    const walletId = faker.string.uuid();

    await transactionRepo.createWithBalanceUpdate({
      storedAmount: 100,
      type: "EXPENSE",
      paymentMethod: "CASH",
      date: new Date(),
      description: "target category",
      walletId,
      categoryId: targetCategoryId,
      userId,
      newBalance: 900,
    });
    await transactionRepo.createWithBalanceUpdate({
      storedAmount: 50,
      type: "EXPENSE",
      paymentMethod: "CASH",
      date: new Date(),
      description: "other category",
      walletId,
      categoryId: otherCategoryId,
      userId,
      newBalance: 850,
    });

    // Act
    const result = await getTransactions({ userId, page: 1, limit: 20, categoryId: targetCategoryId });

    // Assert
    expect(result.data).toHaveLength(1);
    expect(result.data[0]!.categoryId).toBe(targetCategoryId);
  });

  it("should filter transactions by date range", async () => {
    // Arrange
    const userId = faker.string.uuid();
    const walletId = faker.string.uuid();

    const inRange = new Date("2024-06-15T10:00:00Z");
    const outOfRange = new Date("2024-04-01T10:00:00Z");

    await transactionRepo.createWithBalanceUpdate({
      storedAmount: 200,
      type: "INCOME",
      paymentMethod: "CASH",
      date: inRange,
      description: "in range",
      walletId,
      categoryId: faker.string.uuid(),
      userId,
      newBalance: 200,
    });
    await transactionRepo.createWithBalanceUpdate({
      storedAmount: 300,
      type: "INCOME",
      paymentMethod: "CASH",
      date: outOfRange,
      description: "out of range",
      walletId,
      categoryId: faker.string.uuid(),
      userId,
      newBalance: 500,
    });

    // Act
    const result = await getTransactions({
      userId,
      page: 1,
      limit: 20,
      startDate: new Date("2024-06-01T00:00:00Z"),
      endDate: new Date("2024-06-30T23:59:59Z"),
    });

    // Assert
    expect(result.data).toHaveLength(1);
    expect(result.data[0]!.description).toBe("in range");
  });

  it("should not return a future installment (October) when filtering transactions by the September date range", async () => {
    // Arrange
    const userId = faker.string.uuid();
    const walletId = faker.string.uuid();

    await transactionRepo.createManyWalletInstallments(
      [
        {
          amount: 100,
          type: "EXPENSE",
          paymentMethod: "CASH",
          date: new Date(2024, 8, 10), // September 10, 2024
          description: "Geladeira (1/2)",
          walletId,
          categoryId: faker.string.uuid(),
          userId,
          installmentId: faker.string.uuid(),
          installmentNumber: 1,
        },
        {
          amount: 100,
          type: "EXPENSE",
          paymentMethod: "CASH",
          date: new Date(2024, 9, 10), // October 10, 2024
          description: "Geladeira (2/2)",
          walletId,
          categoryId: faker.string.uuid(),
          userId,
          installmentId: faker.string.uuid(),
          installmentNumber: 2,
        },
      ],
      walletId,
      900
    );

    // Act — filter strictly within September
    const result = await getTransactions({
      userId,
      page: 1,
      limit: 20,
      startDate: new Date(2024, 8, 1),
      endDate: new Date(2024, 8, 30, 23, 59, 59, 999),
    });

    // Assert
    expect(result.data).toHaveLength(1);
    expect(result.data[0]!.description).toBe("Geladeira (1/2)");
    expect(result.meta.totalCount).toBe(1);
  });

  it("should filter transactions by month and year (competência)", async () => {
    // Arrange
    const userId = faker.string.uuid();
    const walletId = faker.string.uuid();

    await transactionRepo.createWithBalanceUpdate({
      storedAmount: 200,
      type: "INCOME",
      paymentMethod: "CASH",
      date: new Date(2024, 7, 15), // August 2024
      description: "in month",
      walletId,
      categoryId: faker.string.uuid(),
      userId,
      newBalance: 200,
    });
    await transactionRepo.createWithBalanceUpdate({
      storedAmount: 300,
      type: "INCOME",
      paymentMethod: "CASH",
      date: new Date(2024, 8, 1), // September 2024
      description: "out of month",
      walletId,
      categoryId: faker.string.uuid(),
      userId,
      newBalance: 500,
    });

    // Act
    const result = await getTransactions({ userId, page: 1, limit: 20, month: 8, year: 2024 });

    // Assert
    expect(result.data).toHaveLength(1);
    expect(result.data[0]!.description).toBe("in month");
  });

  it("should filter transactions by year only, covering every month of that year", async () => {
    // Arrange
    const userId = faker.string.uuid();
    const walletId = faker.string.uuid();

    await transactionRepo.createWithBalanceUpdate({
      storedAmount: 100,
      type: "INCOME",
      paymentMethod: "CASH",
      date: new Date(2024, 0, 5),
      description: "january 2024",
      walletId,
      categoryId: faker.string.uuid(),
      userId,
      newBalance: 100,
    });
    await transactionRepo.createWithBalanceUpdate({
      storedAmount: 100,
      type: "INCOME",
      paymentMethod: "CASH",
      date: new Date(2025, 0, 5),
      description: "january 2025",
      walletId,
      categoryId: faker.string.uuid(),
      userId,
      newBalance: 200,
    });

    // Act
    const result = await getTransactions({ userId, page: 1, limit: 20, year: 2024 });

    // Assert
    expect(result.data).toHaveLength(1);
    expect(result.data[0]!.description).toBe("january 2024");
  });

  it("should default the year to the current year when only month is given", async () => {
    // Arrange
    const userId = faker.string.uuid();
    const walletId = faker.string.uuid();
    const now = new Date();

    await transactionRepo.createWithBalanceUpdate({
      storedAmount: 100,
      type: "INCOME",
      paymentMethod: "CASH",
      date: new Date(now.getFullYear(), 5, 10), // June of current year
      description: "this year june",
      walletId,
      categoryId: faker.string.uuid(),
      userId,
      newBalance: 100,
    });
    await transactionRepo.createWithBalanceUpdate({
      storedAmount: 100,
      type: "INCOME",
      paymentMethod: "CASH",
      date: new Date(now.getFullYear() - 1, 5, 10), // June of last year
      description: "last year june",
      walletId,
      categoryId: faker.string.uuid(),
      userId,
      newBalance: 200,
    });

    // Act
    const result = await getTransactions({ userId, page: 1, limit: 20, month: 6 });

    // Assert
    expect(result.data).toHaveLength(1);
    expect(result.data[0]!.description).toBe("this year june");
  });

  it("should return everything when neither month/year nor startDate/endDate are given", async () => {
    // Arrange
    const userId = faker.string.uuid();
    const walletId = faker.string.uuid();

    await transactionRepo.createWithBalanceUpdate({
      storedAmount: 100,
      type: "INCOME",
      paymentMethod: "CASH",
      date: new Date(2020, 0, 1),
      description: "old",
      walletId,
      categoryId: faker.string.uuid(),
      userId,
      newBalance: 100,
    });
    await transactionRepo.createWithBalanceUpdate({
      storedAmount: 100,
      type: "INCOME",
      paymentMethod: "CASH",
      date: new Date(2027, 0, 1),
      description: "future",
      walletId,
      categoryId: faker.string.uuid(),
      userId,
      newBalance: 200,
    });

    // Act
    const result = await getTransactions({ userId, page: 1, limit: 20 });

    // Assert — unfiltered listing must not silently narrow to any default period
    expect(result.data).toHaveLength(2);
  });

  it("should prioritize explicit startDate/endDate over month/year when both are present", async () => {
    // Arrange
    const userId = faker.string.uuid();
    const walletId = faker.string.uuid();

    await transactionRepo.createWithBalanceUpdate({
      storedAmount: 100,
      type: "INCOME",
      paymentMethod: "CASH",
      date: new Date(2024, 7, 15), // August 2024
      description: "august",
      walletId,
      categoryId: faker.string.uuid(),
      userId,
      newBalance: 100,
    });
    await transactionRepo.createWithBalanceUpdate({
      storedAmount: 100,
      type: "INCOME",
      paymentMethod: "CASH",
      date: new Date(2024, 6, 15), // July 2024
      description: "july",
      walletId,
      categoryId: faker.string.uuid(),
      userId,
      newBalance: 200,
    });

    // Act — month/year point at August, but startDate/endDate point at July
    const result = await getTransactions({
      userId,
      page: 1,
      limit: 20,
      month: 8,
      year: 2024,
      startDate: new Date(2024, 6, 1),
      endDate: new Date(2024, 6, 31, 23, 59, 59, 999),
    });

    // Assert
    expect(result.data).toHaveLength(1);
    expect(result.data[0]!.description).toBe("july");
  });

  it("should paginate results and return the correct page slice", async () => {
    // Arrange
    const userId = faker.string.uuid();
    const walletId = faker.string.uuid();

    // Create 5 transactions
    for (let i = 0; i < 5; i++) {
      await transactionRepo.createWithBalanceUpdate({
        storedAmount: 10 * (i + 1),
        type: "EXPENSE",
        paymentMethod: "CASH",
        date: new Date(2024, 0, i + 1),
        description: `tx-${i + 1}`,
        walletId,
        categoryId: faker.string.uuid(),
        userId,
        newBalance: 1000 - 10 * (i + 1),
      });
    }

    // Act — page 2 with limit 2 should return items 3 and 4 (sorted desc by date)
    const result = await getTransactions({ userId, page: 2, limit: 2 });

    // Assert
    expect(result.data).toHaveLength(2);
    expect(result.meta.totalCount).toBe(5);
    expect(result.meta.totalPages).toBe(3);
    expect(result.meta.page).toBe(2);
  });

  it("should filter transactions by search text and type combined", async () => {
    // Arrange
    const userId = faker.string.uuid();
    const walletId = faker.string.uuid();

    await transactionRepo.createWithBalanceUpdate({
      storedAmount: 35,
      type: "EXPENSE",
      paymentMethod: "CASH",
      date: new Date(),
      description: "Uber to the airport",
      walletId,
      categoryId: faker.string.uuid(),
      userId,
      newBalance: 965,
    });
    await transactionRepo.createWithBalanceUpdate({
      storedAmount: 1500,
      type: "INCOME",
      paymentMethod: "CASH",
      date: new Date(),
      description: "Uber driver payout",
      walletId,
      categoryId: faker.string.uuid(),
      userId,
      newBalance: 2465,
    });
    await transactionRepo.createWithBalanceUpdate({
      storedAmount: 20,
      type: "EXPENSE",
      paymentMethod: "CASH",
      date: new Date(),
      description: "Grocery store",
      walletId,
      categoryId: faker.string.uuid(),
      userId,
      newBalance: 2445,
    });

    // Act
    const result = await getTransactions({
      userId,
      page: 1,
      limit: 20,
      search: "uber",
      type: "EXPENSE",
    });

    // Assert
    expect(result.data).toHaveLength(1);
    expect(result.data[0]!.description).toBe("Uber to the airport");
    expect(result.meta.totalCount).toBe(1);
  });

  it("should return empty data with totalCount 0 when no transactions match", async () => {
    // Arrange
    const userId = faker.string.uuid();

    // Act
    const result = await getTransactions({ userId, page: 1, limit: 20 });

    // Assert
    expect(result.data).toHaveLength(0);
    expect(result.meta.totalCount).toBe(0);
    expect(result.meta.totalPages).toBe(0);
  });

  it("should expose a distinct invoice per credit card installment so clients can group by billing cycle", async () => {
    // Arrange
    const userId = faker.string.uuid();
    const categoryRepo = makeInMemoryCategoryRepository();
    const creditCard = { id: faker.string.uuid(), closingDay: 10, dueDay: 5, userId };
    const createTransaction = makeCreateTransactionUseCase(
      transactionRepo as any,
      (id) => walletRepo.findById(id) as any,
      (id) => categoryRepo.findById(id) as any,
      async (id) => (id === creditCard.id ? creditCard : null)
    );

    // Act — R$300 em 3x no cartão, comprado após o fechamento (dia 15 > closingDay 10)
    await createTransaction({
      userId,
      creditCardId: creditCard.id,
      type: "EXPENSE",
      paymentMethod: "CREDIT",
      amount: 300,
      date: new Date(2024, 7, 15), // August 15, 2024
      description: "Fogão",
      installments: 3,
    });
    const result = await getTransactions({ userId, page: 1, limit: 20, creditCardId: creditCard.id });

    // Assert — cada parcela deve carregar a fatura (competência/vencimento) à qual pertence
    expect(result.data).toHaveLength(3);
    const invoiceIds = result.data.map((t) => t.invoice?.id);
    expect(new Set(invoiceIds).size).toBe(3);
    for (const transaction of result.data) {
      expect(transaction.invoiceId).not.toBeNull();
      expect(transaction.invoice).not.toBeNull();
      expect(transaction.invoice!.id).toBe(transaction.invoiceId);
    }

    // Vencimentos sequenciais: Out/2024, Nov/2024, Dez/2024
    const dueMonths = result.data
      .slice()
      .sort((a, b) => a.installmentNumber! - b.installmentNumber!)
      .map((t) => t.invoice!.dueDate.getMonth());
    expect(dueMonths).toEqual([9, 10, 11]);
  });

  it("should keep two purchases in the same invoice when the billing period spans two calendar months", async () => {
    // Arrange — fechamento dia 25: compra em 28/dez e em 05/jan caem na MESMA fatura (venc. fev)
    const userId = faker.string.uuid();
    const categoryRepo = makeInMemoryCategoryRepository();
    const creditCard = { id: faker.string.uuid(), closingDay: 25, dueDay: 5, userId };
    const createTransaction = makeCreateTransactionUseCase(
      transactionRepo as any,
      (id) => walletRepo.findById(id) as any,
      (id) => categoryRepo.findById(id) as any,
      async (id) => (id === creditCard.id ? creditCard : null)
    );

    // Act
    await createTransaction({
      userId,
      creditCardId: creditCard.id,
      type: "EXPENSE",
      paymentMethod: "CREDIT",
      amount: 80,
      date: new Date(2024, 11, 28), // December 28, 2024 (after closing)
      description: "Presente de Natal",
    });
    await createTransaction({
      userId,
      creditCardId: creditCard.id,
      type: "EXPENSE",
      paymentMethod: "CREDIT",
      amount: 40,
      date: new Date(2025, 0, 5), // January 5, 2025 (before closing)
      description: "Farmácia",
    });
    const result = await getTransactions({ userId, page: 1, limit: 20, creditCardId: creditCard.id });

    // Assert — mesma fatura mesmo estando em meses civis diferentes
    expect(result.data).toHaveLength(2);
    expect(result.data[0]!.invoice!.id).toBe(result.data[1]!.invoice!.id);
    expect(result.data[0]!.invoice!.dueDate.getMonth()).toBe(1); // Fevereiro
  });
});
