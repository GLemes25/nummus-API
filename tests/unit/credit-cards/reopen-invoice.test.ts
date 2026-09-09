import { describe, it, expect } from "vitest";
import { makeInMemoryCreditCardRepository } from "../../repositories/in-memory-credit-card.repository.js";
import { makeInMemoryWalletRepository } from "../../repositories/in-memory-wallet.repository.js";
import { makeInMemoryCategoryRepository } from "../../repositories/in-memory-category.repository.js";
import { makePayInvoiceUseCase } from "../../../src/modules/credit-cards/use-cases/pay-invoice.use-case.js";
import { makeReopenInvoiceUseCase } from "../../../src/modules/credit-cards/use-cases/reopen-invoice.use-case.js";
import { makeFakeCreditCard } from "../../factories/credit-card.factory.js";
import { makeFakeWallet } from "../../factories/wallet.factory.js";

describe("reopen-invoice use case", () => {
  it("should reverse a fully paid invoice: clear paid/paidAmount and refund the wallet", async () => {
    // Arrange
    const walletRepo = makeInMemoryWalletRepository();
    const cardRepo = makeInMemoryCreditCardRepository(walletRepo.items);
    const categoryRepo = makeInMemoryCategoryRepository();
    const payInvoice = makePayInvoiceUseCase(
      cardRepo as any,
      walletRepo.findById,
      categoryRepo.findBySystemId,
      categoryRepo.createSystemCategory,
    );
    const reopenInvoice = makeReopenInvoiceUseCase(cardRepo as any);

    const userId = "user-1";
    const wallet = await walletRepo.create(makeFakeWallet({ userId, initialBalance: 1000 }));
    const card = await cardRepo.create(makeFakeCreditCard({ userId }));
    cardRepo.invoices.push({
      id: "inv-1",
      creditCardId: card.id,
      totalAmount: 300,
      paidAmount: 0,
      paid: false,
      deletedAt: null,
    });

    await payInvoice({ creditCardId: card.id, invoiceId: "inv-1", walletId: wallet.id, userId });
    expect(walletRepo.items[0]!.balance).toBe(700);
    expect(cardRepo.invoices[0]!.paid).toBe(true);

    // Act
    await reopenInvoice({ invoiceId: "inv-1", userId });

    // Assert
    expect(cardRepo.invoices[0]!.paid).toBe(false);
    expect(cardRepo.invoices[0]!.paidAmount).toBe(0);
    expect(walletRepo.items[0]!.balance).toBe(1000);
  });

  it("should clear paidAt on itemized transactions that were settled by the reversed payment", async () => {
    // Arrange
    const walletRepo = makeInMemoryWalletRepository();
    const cardRepo = makeInMemoryCreditCardRepository(walletRepo.items);
    const categoryRepo = makeInMemoryCategoryRepository();
    const payInvoice = makePayInvoiceUseCase(
      cardRepo as any,
      walletRepo.findById,
      categoryRepo.findBySystemId,
      categoryRepo.createSystemCategory,
    );
    const reopenInvoice = makeReopenInvoiceUseCase(cardRepo as any);

    const userId = "user-1";
    const wallet = await walletRepo.create(makeFakeWallet({ userId, initialBalance: 1000 }));
    const card = await cardRepo.create(makeFakeCreditCard({ userId }));
    cardRepo.invoices.push({
      id: "inv-1",
      creditCardId: card.id,
      totalAmount: 200,
      paidAmount: 0,
      paid: false,
      deletedAt: null,
    });
    cardRepo.invoiceTransactions.push({ id: "tx-1", invoiceId: "inv-1", amount: 200, paidAt: null });

    await payInvoice({
      creditCardId: card.id,
      invoiceId: "inv-1",
      walletId: wallet.id,
      userId,
      transactionIds: ["tx-1"],
    });
    expect(cardRepo.invoiceTransactions[0]!.paidAt).not.toBeNull();

    // Act
    await reopenInvoice({ invoiceId: "inv-1", userId });

    // Assert
    expect(cardRepo.invoiceTransactions[0]!.paidAt).toBeNull();
    expect(cardRepo.invoices[0]!.paid).toBe(false);
    expect(cardRepo.invoices[0]!.paidAmount).toBe(0);
  });

  it("should reverse a partially paid invoice and keep it usable for a new payment afterwards", async () => {
    // Arrange
    const walletRepo = makeInMemoryWalletRepository();
    const cardRepo = makeInMemoryCreditCardRepository(walletRepo.items);
    const categoryRepo = makeInMemoryCategoryRepository();
    const payInvoice = makePayInvoiceUseCase(
      cardRepo as any,
      walletRepo.findById,
      categoryRepo.findBySystemId,
      categoryRepo.createSystemCategory,
    );
    const reopenInvoice = makeReopenInvoiceUseCase(cardRepo as any);

    const userId = "user-1";
    const wallet = await walletRepo.create(makeFakeWallet({ userId, initialBalance: 1000 }));
    const card = await cardRepo.create(makeFakeCreditCard({ userId }));
    cardRepo.invoices.push({
      id: "inv-1",
      creditCardId: card.id,
      totalAmount: 500,
      paidAmount: 0,
      paid: false,
      deletedAt: null,
    });

    await payInvoice({ creditCardId: card.id, invoiceId: "inv-1", walletId: wallet.id, userId, amount: 200 });
    expect(walletRepo.items[0]!.balance).toBe(800);

    // Act
    await reopenInvoice({ invoiceId: "inv-1", userId });

    // Assert
    expect(cardRepo.invoices[0]!.paidAmount).toBe(0);
    expect(walletRepo.items[0]!.balance).toBe(1000);

    // Sanity: invoice can be paid again from scratch
    await payInvoice({ creditCardId: card.id, invoiceId: "inv-1", walletId: wallet.id, userId, amount: 500 });
    expect(cardRepo.invoices[0]!.paid).toBe(true);
    expect(walletRepo.items[0]!.balance).toBe(500);
  });

  it("should throw INVOICE_NOT_FOUND when the invoice does not exist", async () => {
    // Arrange
    const walletRepo = makeInMemoryWalletRepository();
    const cardRepo = makeInMemoryCreditCardRepository(walletRepo.items);
    const reopenInvoice = makeReopenInvoiceUseCase(cardRepo as any);

    // Act & Assert
    await expect(reopenInvoice({ invoiceId: "non-existent", userId: "user-1" })).rejects.toMatchObject({
      code: "INVOICE_NOT_FOUND",
    });
  });

  it("should throw CREDIT_CARD_ACCESS_DENIED when the invoice belongs to another user's card", async () => {
    // Arrange
    const walletRepo = makeInMemoryWalletRepository();
    const cardRepo = makeInMemoryCreditCardRepository(walletRepo.items);
    const categoryRepo = makeInMemoryCategoryRepository();
    const payInvoice = makePayInvoiceUseCase(
      cardRepo as any,
      walletRepo.findById,
      categoryRepo.findBySystemId,
      categoryRepo.createSystemCategory,
    );
    const reopenInvoice = makeReopenInvoiceUseCase(cardRepo as any);

    const ownerId = "card-owner";
    const wallet = await walletRepo.create(makeFakeWallet({ userId: ownerId, initialBalance: 1000 }));
    const card = await cardRepo.create(makeFakeCreditCard({ userId: ownerId }));
    cardRepo.invoices.push({
      id: "inv-1",
      creditCardId: card.id,
      totalAmount: 300,
      paidAmount: 0,
      paid: false,
      deletedAt: null,
    });
    await payInvoice({ creditCardId: card.id, invoiceId: "inv-1", walletId: wallet.id, userId: ownerId });

    // Act & Assert
    await expect(reopenInvoice({ invoiceId: "inv-1", userId: "intruder" })).rejects.toMatchObject({
      code: "CREDIT_CARD_ACCESS_DENIED",
    });
  });

  it("should throw INVOICE_NOT_PAID when the invoice has no payments to reverse", async () => {
    // Arrange
    const walletRepo = makeInMemoryWalletRepository();
    const cardRepo = makeInMemoryCreditCardRepository(walletRepo.items);
    const reopenInvoice = makeReopenInvoiceUseCase(cardRepo as any);

    const userId = "user-1";
    const card = await cardRepo.create(makeFakeCreditCard({ userId }));
    cardRepo.invoices.push({
      id: "inv-1",
      creditCardId: card.id,
      totalAmount: 300,
      paidAmount: 0,
      paid: false,
      deletedAt: null,
    });

    // Act & Assert
    await expect(reopenInvoice({ invoiceId: "inv-1", userId })).rejects.toMatchObject({
      code: "INVOICE_NOT_PAID",
    });
  });
});
