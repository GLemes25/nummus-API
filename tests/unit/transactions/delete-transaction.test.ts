import { describe, it, expect, beforeEach } from "vitest";
import { faker } from "@faker-js/faker";
import { makeCreateTransactionUseCase } from "../../../src/modules/transactions/use-cases/create-transaction.use-case.js";
import { makeDeleteTransactionUseCase } from "../../../src/modules/transactions/use-cases/delete-transaction.use-case.js";
import { makeInMemoryWalletRepository } from "../../repositories/in-memory-wallet.repository.js";
import { makeInMemoryCategoryRepository } from "../../repositories/in-memory-category.repository.js";
import { makeInMemoryTransactionRepository } from "../../repositories/in-memory-transaction.repository.js";
import { makeFakeWallet } from "../../factories/wallet.factory.js";
import { makeFakeCategory } from "../../factories/category.factory.js";
import { makeFakeTransaction } from "../../factories/transaction.factory.js";

describe("makeDeleteTransactionUseCase", () => {
  let walletRepo: ReturnType<typeof makeInMemoryWalletRepository>;
  let categoryRepo: ReturnType<typeof makeInMemoryCategoryRepository>;
  let transactionRepo: ReturnType<typeof makeInMemoryTransactionRepository>;
  let createTransaction: ReturnType<typeof makeCreateTransactionUseCase>;
  let deleteTransaction: ReturnType<typeof makeDeleteTransactionUseCase>;

  beforeEach(() => {
    walletRepo = makeInMemoryWalletRepository();
    categoryRepo = makeInMemoryCategoryRepository();
    transactionRepo = makeInMemoryTransactionRepository(walletRepo.items);
    createTransaction = makeCreateTransactionUseCase(
      transactionRepo as any,
      (id) => walletRepo.findById(id) as any,
      (id) => categoryRepo.findById(id) as any,
      async () => null
    );
    deleteTransaction = makeDeleteTransactionUseCase(transactionRepo as any);
  });

  it("should soft-delete an EXPENSE transaction and revert the wallet balance", async () => {
    // Arrange
    const userId = faker.string.uuid();
    const wallet = await walletRepo.create(makeFakeWallet({ userId, initialBalance: 1000 }));
    const category = await categoryRepo.create(makeFakeCategory({ userId }));

    const transaction = await createTransaction(
      makeFakeTransaction({
        userId,
        walletId: wallet.id,
        categoryId: category.id,
        type: "EXPENSE",
        paymentMethod: "CASH",
        amount: 300,
      })
    );

    const walletAfterExpense = walletRepo.items.find((w) => w.id === wallet.id);
    expect(walletAfterExpense?.balance).toBe(700);

    // Act
    await deleteTransaction({ transactionId: transaction.id, userId });

    // Assert
    const deletedTransaction = transactionRepo.items.find((t) => t.id === transaction.id);
    expect(deletedTransaction?.deletedAt).not.toBeNull();

    const walletAfterReversal = walletRepo.items.find((w) => w.id === wallet.id);
    expect(walletAfterReversal?.balance).toBe(1000);
  });

  it("should soft-delete an INCOME transaction and revert the wallet balance", async () => {
    // Arrange
    const userId = faker.string.uuid();
    const wallet = await walletRepo.create(makeFakeWallet({ userId, initialBalance: 500 }));
    const category = await categoryRepo.create(makeFakeCategory({ userId }));

    const transaction = await createTransaction(
      makeFakeTransaction({
        userId,
        walletId: wallet.id,
        categoryId: category.id,
        type: "INCOME",
        paymentMethod: "CASH",
        amount: 200,
      })
    );

    expect(walletRepo.items.find((w) => w.id === wallet.id)?.balance).toBe(700);

    // Act
    await deleteTransaction({ transactionId: transaction.id, userId });

    // Assert
    const deletedTransaction = transactionRepo.items.find((t) => t.id === transaction.id);
    expect(deletedTransaction?.deletedAt).not.toBeNull();
    expect(walletRepo.items.find((w) => w.id === wallet.id)?.balance).toBe(500);
  });

  it("should throw TRANSACTION_NOT_FOUND when the transaction does not exist", async () => {
    // Arrange
    const userId = faker.string.uuid();

    // Act & Assert
    await expect(
      deleteTransaction({ transactionId: faker.string.uuid(), userId })
    ).rejects.toMatchObject({
      code: "TRANSACTION_NOT_FOUND",
      message: "Transação não encontrada",
      statusCode: 404,
    });
  });

  it("should throw TRANSACTION_ACCESS_DENIED when the transaction belongs to another user", async () => {
    // Arrange
    const ownerId = faker.string.uuid();
    const otherUserId = faker.string.uuid();
    const wallet = await walletRepo.create(makeFakeWallet({ userId: ownerId, initialBalance: 1000 }));
    const category = await categoryRepo.create(makeFakeCategory({ userId: ownerId }));

    const transaction = await createTransaction(
      makeFakeTransaction({
        userId: ownerId,
        walletId: wallet.id,
        categoryId: category.id,
        type: "EXPENSE",
        paymentMethod: "CASH",
        amount: 100,
      })
    );

    // Act & Assert
    await expect(
      deleteTransaction({ transactionId: transaction.id, userId: otherUserId })
    ).rejects.toMatchObject({
      code: "TRANSACTION_ACCESS_DENIED",
      statusCode: 403,
    });
  });

  it("should be idempotent and not refund the wallet twice if deleted repeatedly", async () => {
    // Arrange
    const userId = faker.string.uuid();
    const wallet = await walletRepo.create(makeFakeWallet({ userId, initialBalance: 1000 }));
    const category = await categoryRepo.create(makeFakeCategory({ userId }));

    const transaction = await createTransaction(
      makeFakeTransaction({
        userId,
        walletId: wallet.id,
        categoryId: category.id,
        type: "EXPENSE",
        paymentMethod: "CASH",
        amount: 100,
      })
    );

    // Act
    await deleteTransaction({ transactionId: transaction.id, userId });
    const balanceAfterFirstDelete = walletRepo.items.find((w) => w.id === wallet.id)?.balance;

    await deleteTransaction({ transactionId: transaction.id, userId });
    const balanceAfterSecondDelete = walletRepo.items.find((w) => w.id === wallet.id)?.balance;

    // Assert
    expect(balanceAfterFirstDelete).toBe(1000);
    expect(balanceAfterSecondDelete).toBe(1000);
  });
});
