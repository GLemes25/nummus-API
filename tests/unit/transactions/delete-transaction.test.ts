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

  it("should revert invoice paidAmount and paid status when the invoice payment transaction is deleted", async () => {
    // Arrange
    const userId = faker.string.uuid();
    const wallet = await walletRepo.create(makeFakeWallet({ userId, initialBalance: 1000 }));
    const category = await categoryRepo.create(makeFakeCategory({ userId }));

    transactionRepo.invoices.push({
      id: "inv-1",
      creditCardId: faker.string.uuid(),
      periodStartDate: faker.date.recent(),
      periodEndDate: faker.date.soon(),
      dueDate: faker.date.soon(),
      totalAmount: 300,
      paidAmount: 300,
      paid: true,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // A payment transaction: wallet-side EXPENSE linked to the invoice, no creditCardId
    const paymentTransaction = await createTransaction(
      makeFakeTransaction({
        userId,
        walletId: wallet.id,
        categoryId: category.id,
        type: "EXPENSE",
        paymentMethod: "CASH",
        amount: 300,
      })
    );
    transactionRepo.items.find((t) => t.id === paymentTransaction.id)!.invoiceId = "inv-1";

    expect(walletRepo.items.find((w) => w.id === wallet.id)?.balance).toBe(700);

    // Act
    await deleteTransaction({ transactionId: paymentTransaction.id, userId });

    // Assert — wallet refunded and invoice rolled back to unpaid
    expect(walletRepo.items.find((w) => w.id === wallet.id)?.balance).toBe(1000);
    const invoice = transactionRepo.invoices.find((i) => i.id === "inv-1")!;
    expect(invoice.paidAmount).toBe(0);
    expect(invoice.paid).toBe(false);
  });

  it("should only partially revert paidAmount when the deleted payment did not cover the whole invoice", async () => {
    // Arrange
    const userId = faker.string.uuid();
    const wallet = await walletRepo.create(makeFakeWallet({ userId, initialBalance: 1000 }));
    const category = await categoryRepo.create(makeFakeCategory({ userId }));

    transactionRepo.invoices.push({
      id: "inv-1",
      creditCardId: faker.string.uuid(),
      periodStartDate: faker.date.recent(),
      periodEndDate: faker.date.soon(),
      dueDate: faker.date.soon(),
      totalAmount: 500,
      paidAmount: 200,
      paid: false,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const paymentTransaction = await createTransaction(
      makeFakeTransaction({
        userId,
        walletId: wallet.id,
        categoryId: category.id,
        type: "EXPENSE",
        paymentMethod: "CASH",
        amount: 200,
      })
    );
    transactionRepo.items.find((t) => t.id === paymentTransaction.id)!.invoiceId = "inv-1";

    // Act
    await deleteTransaction({ transactionId: paymentTransaction.id, userId });

    // Assert
    const invoice = transactionRepo.invoices.find((i) => i.id === "inv-1")!;
    expect(invoice.paidAmount).toBe(0);
    expect(invoice.paid).toBe(false);
  });

  it("should clear paidAt on the card transactions settled by a deleted itemized payment", async () => {
    // Arrange
    const userId = faker.string.uuid();
    const wallet = await walletRepo.create(makeFakeWallet({ userId, initialBalance: 1000 }));
    const category = await categoryRepo.create(makeFakeCategory({ userId }));
    const creditCardId = faker.string.uuid();

    transactionRepo.invoices.push({
      id: "inv-1",
      creditCardId,
      periodStartDate: faker.date.recent(),
      periodEndDate: faker.date.soon(),
      dueDate: faker.date.soon(),
      totalAmount: 200,
      paidAmount: 200,
      paid: true,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const paymentTransaction = await createTransaction(
      makeFakeTransaction({
        userId,
        walletId: wallet.id,
        categoryId: category.id,
        type: "EXPENSE",
        paymentMethod: "CASH",
        amount: 200,
      })
    );
    const payment = transactionRepo.items.find((t) => t.id === paymentTransaction.id)!;
    payment.invoiceId = "inv-1";

    // Two card transactions that were settled by this payment
    transactionRepo.items.push(
      {
        id: "card-tx-1",
        amount: 120,
        type: "EXPENSE",
        paymentMethod: "CREDIT",
        status: "COMPLETED",
        date: new Date(),
        description: "compra 1",
        walletId: null,
        creditCardId,
        invoiceId: "inv-1",
        categoryId: category.id,
        userId,
        installmentId: null,
        installmentNumber: null,
        paidAt: new Date(),
        paidByTransactionId: paymentTransaction.id,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "card-tx-2",
        amount: 80,
        type: "EXPENSE",
        paymentMethod: "CREDIT",
        status: "COMPLETED",
        date: new Date(),
        description: "compra 2",
        walletId: null,
        creditCardId,
        invoiceId: "inv-1",
        categoryId: category.id,
        userId,
        installmentId: null,
        installmentNumber: null,
        paidAt: new Date(),
        paidByTransactionId: paymentTransaction.id,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    );

    // Act
    await deleteTransaction({ transactionId: paymentTransaction.id, userId });

    // Assert — both settled transactions are pending again
    expect(transactionRepo.items.find((t) => t.id === "card-tx-1")!.paidAt).toBeNull();
    expect(transactionRepo.items.find((t) => t.id === "card-tx-1")!.paidByTransactionId).toBeNull();
    expect(transactionRepo.items.find((t) => t.id === "card-tx-2")!.paidAt).toBeNull();
    expect(transactionRepo.items.find((t) => t.id === "card-tx-2")!.paidByTransactionId).toBeNull();

    const invoice = transactionRepo.invoices.find((i) => i.id === "inv-1")!;
    expect(invoice.paidAmount).toBe(0);
    expect(invoice.paid).toBe(false);
  });

  it("should not revert the invoice twice when the payment transaction is deleted repeatedly", async () => {
    // Arrange
    const userId = faker.string.uuid();
    const wallet = await walletRepo.create(makeFakeWallet({ userId, initialBalance: 1000 }));
    const category = await categoryRepo.create(makeFakeCategory({ userId }));

    transactionRepo.invoices.push({
      id: "inv-1",
      creditCardId: faker.string.uuid(),
      periodStartDate: faker.date.recent(),
      periodEndDate: faker.date.soon(),
      dueDate: faker.date.soon(),
      totalAmount: 300,
      paidAmount: 300,
      paid: true,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const paymentTransaction = await createTransaction(
      makeFakeTransaction({
        userId,
        walletId: wallet.id,
        categoryId: category.id,
        type: "EXPENSE",
        paymentMethod: "CASH",
        amount: 300,
      })
    );
    transactionRepo.items.find((t) => t.id === paymentTransaction.id)!.invoiceId = "inv-1";

    // Act
    await deleteTransaction({ transactionId: paymentTransaction.id, userId });
    const invoiceAfterFirstDelete = { ...transactionRepo.invoices.find((i) => i.id === "inv-1")! };
    const balanceAfterFirstDelete = walletRepo.items.find((w) => w.id === wallet.id)?.balance;

    await deleteTransaction({ transactionId: paymentTransaction.id, userId });
    const invoiceAfterSecondDelete = transactionRepo.invoices.find((i) => i.id === "inv-1")!;
    const balanceAfterSecondDelete = walletRepo.items.find((w) => w.id === wallet.id)?.balance;

    // Assert
    expect(invoiceAfterFirstDelete.paidAmount).toBe(0);
    expect(balanceAfterFirstDelete).toBe(1000);
    expect(invoiceAfterSecondDelete.paidAmount).toBe(0);
    expect(balanceAfterSecondDelete).toBe(1000);
  });

  it("should not revert the invoice when the deleted transaction is a card purchase, not a payment", async () => {
    // Arrange — a CREDIT purchase transaction also carries an invoiceId, but it must
    // never trigger the payment-reversal path (it has no walletId, has creditCardId)
    const userId = faker.string.uuid();
    const category = await categoryRepo.create(makeFakeCategory({ userId }));
    const creditCardId = faker.string.uuid();

    transactionRepo.invoices.push({
      id: "inv-1",
      creditCardId,
      periodStartDate: faker.date.recent(),
      periodEndDate: faker.date.soon(),
      dueDate: faker.date.soon(),
      totalAmount: 300,
      paidAmount: 100,
      paid: false,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    transactionRepo.items.push({
      id: "card-tx-1",
      amount: 150,
      type: "EXPENSE",
      paymentMethod: "CREDIT",
      status: "COMPLETED",
      date: new Date(),
      description: "compra no cartão",
      walletId: null,
      creditCardId,
      invoiceId: "inv-1",
      categoryId: category.id,
      userId,
      installmentId: null,
      installmentNumber: null,
      paidAt: null,
      paidByTransactionId: null,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Act
    await deleteTransaction({ transactionId: "card-tx-1", userId });

    // Assert — invoice's paidAmount/paid are untouched by deleting a purchase transaction
    const invoice = transactionRepo.invoices.find((i) => i.id === "inv-1")!;
    expect(invoice.paidAmount).toBe(100);
    expect(invoice.paid).toBe(false);
  });

  it("should soft-delete a BALANCE_ADJUSTMENT transaction without reverting the wallet balance", async () => {
    // Arrange
    const userId = faker.string.uuid();
    const wallet = await walletRepo.create(makeFakeWallet({ userId, initialBalance: 1000 }));
    const category = await categoryRepo.create(makeFakeCategory({ userId }));

    // BA sets wallet balance to 400 (stored delta = 400 - 1000 = -600)
    const transaction = await createTransaction(
      makeFakeTransaction({
        userId,
        walletId: wallet.id,
        categoryId: category.id,
        type: "BALANCE_ADJUSTMENT",
        paymentMethod: "CASH",
        amount: 400,
      })
    );

    expect(walletRepo.items.find((w) => w.id === wallet.id)?.balance).toBe(400);

    // Act
    await deleteTransaction({ transactionId: transaction.id, userId });

    // Assert — BA deletion does NOT revert the wallet to 1000
    const deletedItem = transactionRepo.items.find((t) => t.id === transaction.id);
    expect(deletedItem?.deletedAt).not.toBeNull();

    // Balance stays at 400, not reverted to 1000
    expect(walletRepo.items.find((w) => w.id === wallet.id)?.balance).toBe(400);
  });
});
