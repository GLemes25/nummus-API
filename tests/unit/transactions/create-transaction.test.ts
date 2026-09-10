import { describe, it, expect, beforeEach } from "vitest";
import { faker } from "@faker-js/faker";
import { makeCreateTransactionUseCase } from "../../../src/modules/transactions/use-cases/create-transaction.use-case.js";
import { makeInMemoryWalletRepository } from "../../repositories/in-memory-wallet.repository.js";
import { makeInMemoryCategoryRepository } from "../../repositories/in-memory-category.repository.js";
import { makeInMemoryTransactionRepository } from "../../repositories/in-memory-transaction.repository.js";
import { makeFakeWallet } from "../../factories/wallet.factory.js";
import { makeFakeCategory } from "../../factories/category.factory.js";
import { makeFakeTransaction } from "../../factories/transaction.factory.js";
import { makeFakeCreditCard } from "../../factories/credit-card.factory.js";

describe("makeCreateTransactionUseCase", () => {
  let walletRepo: ReturnType<typeof makeInMemoryWalletRepository>;
  let categoryRepo: ReturnType<typeof makeInMemoryCategoryRepository>;
  let transactionRepo: ReturnType<typeof makeInMemoryTransactionRepository>;
  let creditCards: Array<{ id: string; closingDay: number; dueDay: number; userId: string }>;
  let createTransaction: ReturnType<typeof makeCreateTransactionUseCase>;

  beforeEach(() => {
    walletRepo = makeInMemoryWalletRepository();
    categoryRepo = makeInMemoryCategoryRepository();
    transactionRepo = makeInMemoryTransactionRepository(walletRepo.items);
    creditCards = [];
    createTransaction = makeCreateTransactionUseCase(
      transactionRepo as any,
      (id) => walletRepo.findById(id) as any,
      (id) => categoryRepo.findById(id) as any,
      async (id) => creditCards.find((c) => c.id === id) ?? null
    );
  });

  it("should increase wallet balance when creating an INCOME transaction", async () => {
    // Arrange
    const userId = faker.string.uuid();
    const wallet = await walletRepo.create(makeFakeWallet({ userId, initialBalance: 1000 }));
    const category = await categoryRepo.create(makeFakeCategory({ userId }));

    // Act
    await createTransaction(
      makeFakeTransaction({
        userId,
        walletId: wallet.id,
        categoryId: category.id,
        type: "INCOME",
        paymentMethod: "CASH",
        amount: 500,
      })
    );

    // Assert
    const updatedWallet = walletRepo.items.find((w) => w.id === wallet.id);
    expect(updatedWallet?.balance).toBe(1500);
    expect(transactionRepo.items).toHaveLength(1);
    expect(transactionRepo.items[0]?.type).toBe("INCOME");
  });

  it("should decrease wallet balance when creating an EXPENSE transaction", async () => {
    // Arrange
    const userId = faker.string.uuid();
    const wallet = await walletRepo.create(makeFakeWallet({ userId, initialBalance: 1000 }));
    const category = await categoryRepo.create(makeFakeCategory({ userId }));

    // Act
    await createTransaction(
      makeFakeTransaction({
        userId,
        walletId: wallet.id,
        categoryId: category.id,
        type: "EXPENSE",
        paymentMethod: "CASH",
        amount: 300,
      })
    );

    // Assert
    const updatedWallet = walletRepo.items.find((w) => w.id === wallet.id);
    expect(updatedWallet?.balance).toBe(700);
    expect(transactionRepo.items[0]?.type).toBe("EXPENSE");
  });

  it("should pin wallet balance to the exact amount for a BALANCE_ADJUSTMENT transaction", async () => {
    // Arrange
    const userId = faker.string.uuid();
    const wallet = await walletRepo.create(makeFakeWallet({ userId, initialBalance: 1000 }));
    const category = await categoryRepo.create(makeFakeCategory({ userId }));

    // Act
    await createTransaction(
      makeFakeTransaction({
        userId,
        walletId: wallet.id,
        categoryId: category.id,
        type: "BALANCE_ADJUSTMENT",
        paymentMethod: "CASH",
        amount: 250,
      })
    );

    // Assert
    const updatedWallet = walletRepo.items.find((w) => w.id === wallet.id);
    expect(updatedWallet?.balance).toBe(250);
  });

  it("should throw when the category does not exist", async () => {
    // Arrange
    const userId = faker.string.uuid();
    const wallet = await walletRepo.create(makeFakeWallet({ userId, initialBalance: 500 }));

    // Act & Assert
    await expect(
      createTransaction(
        makeFakeTransaction({
          userId,
          walletId: wallet.id,
          categoryId: faker.string.uuid(),
          type: "EXPENSE",
          paymentMethod: "CASH",
          amount: 100,
        })
      )
    ).rejects.toMatchObject({
      code: "CATEGORY_NOT_FOUND",
      message: "Categoria não encontrada",
    });
  });

  it("should throw when the wallet does not exist", async () => {
    // Arrange
    const userId = faker.string.uuid();
    const category = await categoryRepo.create(makeFakeCategory({ userId }));

    // Act & Assert
    await expect(
      createTransaction(
        makeFakeTransaction({
          userId,
          walletId: faker.string.uuid(),
          categoryId: category.id,
          type: "EXPENSE",
          paymentMethod: "CASH",
          amount: 100,
        })
      )
    ).rejects.toMatchObject({
      code: "WALLET_NOT_FOUND",
      message: "Carteira não encontrada",
    });
  });

  it("should link an EXPENSE transaction to the credit card's open invoice without touching any wallet balance", async () => {
    // Arrange
    const userId = faker.string.uuid();
    const wallet = await walletRepo.create(makeFakeWallet({ userId, initialBalance: 1000 }));
    const category = await categoryRepo.create(makeFakeCategory({ userId }));
    const creditCard = { ...makeFakeCreditCard({ userId }), id: faker.string.uuid() };
    creditCards.push(creditCard);

    // Act
    const transaction = await createTransaction(
      makeFakeTransaction({
        userId,
        walletId: undefined,
        creditCardId: creditCard.id,
        categoryId: category.id,
        type: "EXPENSE",
        paymentMethod: "CREDIT",
        amount: 300,
      })
    );

    // Assert
    expect(transaction.creditCardId).toBe(creditCard.id);
    expect(transaction.walletId).toBeNull();
    expect(transaction.invoiceId).not.toBeNull();
    expect(transactionRepo.invoices).toHaveLength(1);
    expect(transactionRepo.invoices[0]?.totalAmount).toBe(300);

    const untouchedWallet = walletRepo.items.find((w) => w.id === wallet.id);
    expect(untouchedWallet?.balance).toBe(1000);
  });

  it("should reuse the same open invoice for two transactions in the same billing period", async () => {
    // Arrange
    const userId = faker.string.uuid();
    const category = await categoryRepo.create(makeFakeCategory({ userId }));
    const creditCard = { ...makeFakeCreditCard({ userId }), id: faker.string.uuid() };
    creditCards.push(creditCard);
    const sameDay = new Date();

    // Act
    await createTransaction(
      makeFakeTransaction({
        userId,
        walletId: undefined,
        creditCardId: creditCard.id,
        categoryId: category.id,
        type: "EXPENSE",
        paymentMethod: "CREDIT",
        amount: 100,
        date: sameDay,
      })
    );
    await createTransaction(
      makeFakeTransaction({
        userId,
        walletId: undefined,
        creditCardId: creditCard.id,
        categoryId: category.id,
        type: "EXPENSE",
        paymentMethod: "CREDIT",
        amount: 50,
        date: sameDay,
      })
    );

    // Assert
    expect(transactionRepo.invoices).toHaveLength(1);
    expect(transactionRepo.invoices[0]?.totalAmount).toBe(150);
    expect(transactionRepo.items).toHaveLength(2);
    expect(transactionRepo.items[0]?.invoiceId).toBe(transactionRepo.items[1]?.invoiceId);
  });

  it("should throw when the credit card does not exist", async () => {
    // Arrange
    const userId = faker.string.uuid();
    const category = await categoryRepo.create(makeFakeCategory({ userId }));

    // Act & Assert
    await expect(
      createTransaction(
        makeFakeTransaction({
          userId,
          walletId: undefined,
          creditCardId: faker.string.uuid(),
          categoryId: category.id,
          type: "EXPENSE",
          paymentMethod: "CREDIT",
          amount: 100,
        })
      )
    ).rejects.toMatchObject({
      code: "CREDIT_CARD_NOT_FOUND",
      message: "Cartão de crédito não encontrado",
    });
  });

  it("should assign a transaction before the closing day to the PREVIOUS billing period", async () => {
    // Arrange
    const userId = faker.string.uuid();
    const category = await categoryRepo.create(makeFakeCategory({ userId }));
    // closingDay=10, dueDay=5
    const creditCard = { id: faker.string.uuid(), closingDay: 10, dueDay: 5, userId };
    creditCards.push(creditCard);

    // Aug 8 → day 8 <= closingDay 10 → period: Jul 11 → Aug 10
    const transactionDate = new Date(2024, 7, 8); // August 8, 2024

    // Act
    const transaction = await createTransaction(
      makeFakeTransaction({
        userId,
        walletId: undefined,
        creditCardId: creditCard.id,
        categoryId: category.id,
        type: "EXPENSE",
        paymentMethod: "CREDIT",
        amount: 100,
        date: transactionDate,
      })
    );

    // Assert — transaction is linked to an invoice covering July 11 → August 10
    const invoice = transactionRepo.invoices.find((i) => i.id === transaction.invoiceId);
    expect(invoice).toBeDefined();
    // periodStart should be July 11 (month - 1, closingDay + 1)
    expect(invoice!.periodStartDate.getMonth()).toBe(6); // July (0-indexed)
    expect(invoice!.periodStartDate.getDate()).toBe(11);
    // periodEnd should be August 10
    expect(invoice!.periodEndDate.getMonth()).toBe(7); // August (0-indexed)
    expect(invoice!.periodEndDate.getDate()).toBe(10);
  });

  it("should assign a transaction after the closing day to the CURRENT billing period", async () => {
    // Arrange
    const userId = faker.string.uuid();
    const category = await categoryRepo.create(makeFakeCategory({ userId }));
    // closingDay=10, dueDay=5
    const creditCard = { id: faker.string.uuid(), closingDay: 10, dueDay: 5, userId };
    creditCards.push(creditCard);

    // Aug 15 → day 15 > closingDay 10 → period: Aug 11 → Sep 10
    const transactionDate = new Date(2024, 7, 15); // August 15, 2024

    // Act
    const transaction = await createTransaction(
      makeFakeTransaction({
        userId,
        walletId: undefined,
        creditCardId: creditCard.id,
        categoryId: category.id,
        type: "EXPENSE",
        paymentMethod: "CREDIT",
        amount: 200,
        date: transactionDate,
      })
    );

    // Assert — transaction is linked to an invoice covering August 11 → September 10
    const invoice = transactionRepo.invoices.find((i) => i.id === transaction.invoiceId);
    expect(invoice).toBeDefined();
    // periodStart should be August 11
    expect(invoice!.periodStartDate.getMonth()).toBe(7); // August (0-indexed)
    expect(invoice!.periodStartDate.getDate()).toBe(11);
    // periodEnd should be September 10
    expect(invoice!.periodEndDate.getMonth()).toBe(8); // September (0-indexed)
    expect(invoice!.periodEndDate.getDate()).toBe(10);
  });

  it("should create separate invoices for transactions in different billing periods", async () => {
    // Arrange
    const userId = faker.string.uuid();
    const category = await categoryRepo.create(makeFakeCategory({ userId }));
    const creditCard = { id: faker.string.uuid(), closingDay: 10, dueDay: 5, userId };
    creditCards.push(creditCard);

    // Aug 8 → previous period (Jul 11 → Aug 10)
    const dateBefore = new Date(2024, 7, 8);
    // Aug 15 → current period (Aug 11 → Sep 10)
    const dateAfter = new Date(2024, 7, 15);

    // Act
    const tx1 = await createTransaction(
      makeFakeTransaction({
        userId,
        walletId: undefined,
        creditCardId: creditCard.id,
        categoryId: category.id,
        type: "EXPENSE",
        paymentMethod: "CREDIT",
        amount: 100,
        date: dateBefore,
      })
    );
    const tx2 = await createTransaction(
      makeFakeTransaction({
        userId,
        walletId: undefined,
        creditCardId: creditCard.id,
        categoryId: category.id,
        type: "EXPENSE",
        paymentMethod: "CREDIT",
        amount: 200,
        date: dateAfter,
      })
    );

    // Assert — two different invoices are created, one per billing period
    expect(transactionRepo.invoices).toHaveLength(2);
    expect(tx1.invoiceId).not.toBe(tx2.invoiceId);
    expect(transactionRepo.invoices[0]!.totalAmount).toBe(100);
    expect(transactionRepo.invoices[1]!.totalAmount).toBe(200);
  });

  it("should set the transaction date to the invoice's closing date, not the raw purchase date, when the purchase is before the closing day", async () => {
    // Arrange
    const userId = faker.string.uuid();
    const category = await categoryRepo.create(makeFakeCategory({ userId }));
    // closingDay=10, dueDay=5
    const creditCard = { id: faker.string.uuid(), closingDay: 10, dueDay: 5, userId };
    creditCards.push(creditCard);

    // Aug 8 → day 8 <= closingDay 10 → belongs to the period closing Aug 10
    const transactionDate = new Date(2024, 7, 8);

    // Act
    const transaction = await createTransaction(
      makeFakeTransaction({
        userId,
        walletId: undefined,
        creditCardId: creditCard.id,
        categoryId: category.id,
        type: "EXPENSE",
        paymentMethod: "CREDIT",
        amount: 100,
        date: transactionDate,
      })
    );

    // Assert — competência é a data de fechamento (Aug 10), não a data da compra (Aug 8)
    expect(transaction.date.getMonth()).toBe(7); // August
    expect(transaction.date.getDate()).toBe(10);
  });

  it("should set the transaction date to NEXT cycle's closing date when the purchase happens after the closing day", async () => {
    // Arrange
    const userId = faker.string.uuid();
    const category = await categoryRepo.create(makeFakeCategory({ userId }));
    // closingDay=10, dueDay=5
    const creditCard = { id: faker.string.uuid(), closingDay: 10, dueDay: 5, userId };
    creditCards.push(creditCard);

    // Aug 15 → day 15 > closingDay 10 → belongs to the period closing Sep 10
    const transactionDate = new Date(2024, 7, 15);

    // Act
    const transaction = await createTransaction(
      makeFakeTransaction({
        userId,
        walletId: undefined,
        creditCardId: creditCard.id,
        categoryId: category.id,
        type: "EXPENSE",
        paymentMethod: "CREDIT",
        amount: 200,
        date: transactionDate,
      })
    );

    // Assert — competência vai para o fechamento do PRÓXIMO mês (Sep 10), não fica em Ago
    expect(transaction.date.getMonth()).toBe(8); // September
    expect(transaction.date.getDate()).toBe(10);
  });
});
