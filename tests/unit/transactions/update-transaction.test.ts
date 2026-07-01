import { describe, it, expect, beforeEach } from "vitest";
import { faker } from "@faker-js/faker";
import { makeCreateTransactionUseCase } from "../../../src/modules/transactions/use-cases/create-transaction.use-case.js";
import { makeUpdateTransactionUseCase } from "../../../src/modules/transactions/use-cases/update-transaction.use-case.js";
import { makeInMemoryWalletRepository } from "../../repositories/in-memory-wallet.repository.js";
import { makeInMemoryCategoryRepository } from "../../repositories/in-memory-category.repository.js";
import { makeInMemoryTransactionRepository } from "../../repositories/in-memory-transaction.repository.js";
import { makeFakeWallet } from "../../factories/wallet.factory.js";
import { makeFakeCategory } from "../../factories/category.factory.js";
import { makeFakeTransaction } from "../../factories/transaction.factory.js";

describe("makeUpdateTransactionUseCase", () => {
  let walletRepo: ReturnType<typeof makeInMemoryWalletRepository>;
  let categoryRepo: ReturnType<typeof makeInMemoryCategoryRepository>;
  let transactionRepo: ReturnType<typeof makeInMemoryTransactionRepository>;
  let createTransaction: ReturnType<typeof makeCreateTransactionUseCase>;
  let updateTransaction: ReturnType<typeof makeUpdateTransactionUseCase>;

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
    updateTransaction = makeUpdateTransactionUseCase(
      transactionRepo as any,
      (id) => walletRepo.findById(id) as any
    );
  });

  it("should update only the description and keep the wallet balance untouched", async () => {
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
        amount: 50,
      })
    );

    // Act
    const updated = await updateTransaction({
      transactionId: transaction.id,
      userId,
      data: { description: "Updated description" },
    });

    // Assert
    expect(updated?.description).toBe("Updated description");
    expect(walletRepo.items.find((w) => w.id === wallet.id)?.balance).toBe(950);
  });

  it("should decrease the wallet balance further when an EXPENSE amount increases", async () => {
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
        amount: 50,
      })
    );

    expect(walletRepo.items.find((w) => w.id === wallet.id)?.balance).toBe(950);

    // Act
    await updateTransaction({
      transactionId: transaction.id,
      userId,
      data: { amount: 100 },
    });

    // Assert
    expect(walletRepo.items.find((w) => w.id === wallet.id)?.balance).toBe(900);
  });

  it("should reflect removing an INCOME and applying an EXPENSE when the type changes", async () => {
    // Arrange
    const userId = faker.string.uuid();
    const wallet = await walletRepo.create(makeFakeWallet({ userId, initialBalance: 1000 }));
    const category = await categoryRepo.create(makeFakeCategory({ userId }));
    const transaction = await createTransaction(
      makeFakeTransaction({
        userId,
        walletId: wallet.id,
        categoryId: category.id,
        type: "INCOME",
        paymentMethod: "CASH",
        amount: 100,
      })
    );

    expect(walletRepo.items.find((w) => w.id === wallet.id)?.balance).toBe(1100);

    // Act
    await updateTransaction({
      transactionId: transaction.id,
      userId,
      data: { type: "EXPENSE" },
    });

    // Assert
    expect(walletRepo.items.find((w) => w.id === wallet.id)?.balance).toBe(900);
  });

  it("should refund the old wallet and charge the new wallet when the walletId changes", async () => {
    // Arrange
    const userId = faker.string.uuid();
    const oldWallet = await walletRepo.create(makeFakeWallet({ userId, initialBalance: 1000 }));
    const newWallet = await walletRepo.create(makeFakeWallet({ userId, initialBalance: 500 }));
    const category = await categoryRepo.create(makeFakeCategory({ userId }));
    const transaction = await createTransaction(
      makeFakeTransaction({
        userId,
        walletId: oldWallet.id,
        categoryId: category.id,
        type: "EXPENSE",
        paymentMethod: "CASH",
        amount: 100,
      })
    );

    expect(walletRepo.items.find((w) => w.id === oldWallet.id)?.balance).toBe(900);

    // Act
    await updateTransaction({
      transactionId: transaction.id,
      userId,
      data: { walletId: newWallet.id },
    });

    // Assert
    expect(walletRepo.items.find((w) => w.id === oldWallet.id)?.balance).toBe(1000);
    expect(walletRepo.items.find((w) => w.id === newWallet.id)?.balance).toBe(400);
  });

  it("should throw TRANSACTION_NOT_FOUND when the transaction does not exist", async () => {
    // Arrange
    const userId = faker.string.uuid();

    // Act & Assert
    await expect(
      updateTransaction({
        transactionId: faker.string.uuid(),
        userId,
        data: { description: "Anything" },
      })
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
      updateTransaction({
        transactionId: transaction.id,
        userId: otherUserId,
        data: { description: "Anything" },
      })
    ).rejects.toMatchObject({
      code: "TRANSACTION_ACCESS_DENIED",
      statusCode: 403,
    });
  });
});
