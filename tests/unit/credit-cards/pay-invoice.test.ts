import { describe, it, expect } from "vitest";
import { makeInMemoryCreditCardRepository } from "../../repositories/in-memory-credit-card.repository.js";
import { makeInMemoryWalletRepository } from "../../repositories/in-memory-wallet.repository.js";
import { makeInMemoryCategoryRepository } from "../../repositories/in-memory-category.repository.js";
import { makePayInvoiceUseCase } from "../../../src/modules/credit-cards/use-cases/pay-invoice.use-case.js";
import { makeFakeCreditCard } from "../../factories/credit-card.factory.js";
import { makeFakeWallet } from "../../factories/wallet.factory.js";

describe("pay-invoice use case", () => {
  it("should fully pay the given invoice and decrement wallet balance", async () => {
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

    // Act
    await payInvoice({ creditCardId: card.id, invoiceId: "inv-1", walletId: wallet.id, userId });

    // Assert
    expect(cardRepo.invoices[0]!.paid).toBe(true);
    expect(cardRepo.invoices[0]!.paidAmount).toBe(300);
    expect(walletRepo.items[0]!.balance).toBe(700);
  });

  it("should allow paying the current (still open, not yet closed) invoice, not only past closed ones", async () => {
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

    const userId = "user-1";
    const wallet = await walletRepo.create(makeFakeWallet({ userId, initialBalance: 1000 }));
    const card = await cardRepo.create(makeFakeCreditCard({ userId }));

    const now = new Date();
    const periodStartDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEndDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // The invoice's period end date is still in the future — it has not closed yet,
    // it just started accruing this cycle's transactions
    cardRepo.invoices.push({
      id: "inv-current",
      creditCardId: card.id,
      totalAmount: 300,
      paidAmount: 0,
      paid: false,
      deletedAt: null,
      periodStartDate,
      periodEndDate,
      dueDate: new Date(now.getFullYear(), now.getMonth() + 1, 10),
    });

    // Act — pay the current, still-open invoice ahead of its due date
    await payInvoice({ creditCardId: card.id, invoiceId: "inv-current", walletId: wallet.id, userId });

    // Assert
    expect(cardRepo.invoices[0]!.paid).toBe(true);
    expect(cardRepo.invoices[0]!.paidAmount).toBe(300);
    expect(walletRepo.items[0]!.balance).toBe(700);
  });

  it("should partially pay an invoice with a given amount and keep it open", async () => {
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

    // Act
    await payInvoice({ creditCardId: card.id, invoiceId: "inv-1", walletId: wallet.id, userId, amount: 200 });

    // Assert — invoice is only partially paid
    expect(cardRepo.invoices[0]!.paid).toBe(false);
    expect(cardRepo.invoices[0]!.paidAmount).toBe(200);
    expect(walletRepo.items[0]!.balance).toBe(800);
  });

  it("should settle only the listed transactions and deduct their combined amount", async () => {
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
    cardRepo.invoiceTransactions.push(
      { id: "tx-1", invoiceId: "inv-1", amount: 120, paidAt: null },
      { id: "tx-2", invoiceId: "inv-1", amount: 80, paidAt: null },
      { id: "tx-3", invoiceId: "inv-1", amount: 300, paidAt: null },
    );

    // Act — settle only tx-1 and tx-2
    await payInvoice({
      creditCardId: card.id,
      invoiceId: "inv-1",
      walletId: wallet.id,
      userId,
      transactionIds: ["tx-1", "tx-2"],
    });

    // Assert
    expect(walletRepo.items[0]!.balance).toBe(800);
    expect(cardRepo.invoices[0]!.paidAmount).toBe(200);
    expect(cardRepo.invoices[0]!.paid).toBe(false);
    expect(cardRepo.invoiceTransactions.find((t) => t.id === "tx-1")!.paidAt).not.toBeNull();
    expect(cardRepo.invoiceTransactions.find((t) => t.id === "tx-2")!.paidAt).not.toBeNull();
    expect(cardRepo.invoiceTransactions.find((t) => t.id === "tx-3")!.paidAt).toBeNull();
  });

  it("should mark the invoice as fully paid once itemized transactions cover the total amount", async () => {
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

    // Act
    await payInvoice({
      creditCardId: card.id,
      invoiceId: "inv-1",
      walletId: wallet.id,
      userId,
      transactionIds: ["tx-1"],
    });

    // Assert
    expect(cardRepo.invoices[0]!.paid).toBe(true);
  });

  it("should throw NO_OPEN_INVOICE-equivalent INVOICE_NOT_FOUND when the invoice does not exist", async () => {
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

    const userId = "user-1";
    const wallet = await walletRepo.create(makeFakeWallet({ userId }));
    const card = await cardRepo.create(makeFakeCreditCard({ userId }));

    // Act & Assert
    await expect(
      payInvoice({ creditCardId: card.id, invoiceId: "non-existent-invoice", walletId: wallet.id, userId }),
    ).rejects.toMatchObject({ code: "INVOICE_NOT_FOUND" });
  });

  it("should throw INVOICE_CARD_MISMATCH when the invoice belongs to another card", async () => {
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

    const userId = "user-1";
    const wallet = await walletRepo.create(makeFakeWallet({ userId }));
    const card = await cardRepo.create(makeFakeCreditCard({ userId }));
    const otherCard = await cardRepo.create(makeFakeCreditCard({ userId }));
    cardRepo.invoices.push({
      id: "inv-1",
      creditCardId: otherCard.id,
      totalAmount: 300,
      paidAmount: 0,
      paid: false,
      deletedAt: null,
    });

    // Act & Assert
    await expect(
      payInvoice({ creditCardId: card.id, invoiceId: "inv-1", walletId: wallet.id, userId }),
    ).rejects.toMatchObject({ code: "INVOICE_CARD_MISMATCH" });
  });

  it("should throw INVOICE_ALREADY_PAID when the invoice has no remaining balance", async () => {
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

    const userId = "user-1";
    const wallet = await walletRepo.create(makeFakeWallet({ userId }));
    const card = await cardRepo.create(makeFakeCreditCard({ userId }));
    cardRepo.invoices.push({
      id: "inv-1",
      creditCardId: card.id,
      totalAmount: 300,
      paidAmount: 300,
      paid: true,
      deletedAt: null,
    });

    // Act & Assert
    await expect(
      payInvoice({ creditCardId: card.id, invoiceId: "inv-1", walletId: wallet.id, userId }),
    ).rejects.toMatchObject({ code: "INVOICE_ALREADY_PAID" });
  });

  it("should throw INVOICE_TRANSACTION_NOT_FOUND when a listed transaction does not belong to the invoice", async () => {
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

    const userId = "user-1";
    const wallet = await walletRepo.create(makeFakeWallet({ userId }));
    const card = await cardRepo.create(makeFakeCreditCard({ userId }));
    cardRepo.invoices.push({
      id: "inv-1",
      creditCardId: card.id,
      totalAmount: 300,
      paidAmount: 0,
      paid: false,
      deletedAt: null,
    });
    cardRepo.invoiceTransactions.push({ id: "tx-1", invoiceId: "inv-1", amount: 100, paidAt: null });

    // Act & Assert
    await expect(
      payInvoice({
        creditCardId: card.id,
        invoiceId: "inv-1",
        walletId: wallet.id,
        userId,
        transactionIds: ["tx-1", "tx-missing"],
      }),
    ).rejects.toMatchObject({ code: "INVOICE_TRANSACTION_NOT_FOUND" });
  });

  it("should throw PAYMENT_EXCEEDS_INVOICE_BALANCE when the informed amount is greater than the remaining balance", async () => {
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

    // Act & Assert
    await expect(
      payInvoice({ creditCardId: card.id, invoiceId: "inv-1", walletId: wallet.id, userId, amount: 400 }),
    ).rejects.toMatchObject({ code: "PAYMENT_EXCEEDS_INVOICE_BALANCE" });
  });

  it("should throw CREDIT_CARD_NOT_FOUND when card does not exist", async () => {
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

    const userId = "user-1";
    const wallet = await walletRepo.create(makeFakeWallet({ userId }));

    // Act & Assert
    await expect(
      payInvoice({ creditCardId: "non-existent-id", invoiceId: "inv-1", walletId: wallet.id, userId }),
    ).rejects.toMatchObject({ code: "CREDIT_CARD_NOT_FOUND" });
  });

  it("should throw CREDIT_CARD_ACCESS_DENIED when user does not own the card", async () => {
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

    const userId = "user-1";
    const wallet = await walletRepo.create(makeFakeWallet({ userId }));
    const card = await cardRepo.create(makeFakeCreditCard({ userId: "card-owner" }));

    // Act & Assert
    await expect(
      payInvoice({ creditCardId: card.id, invoiceId: "inv-1", walletId: wallet.id, userId }),
    ).rejects.toMatchObject({ code: "CREDIT_CARD_ACCESS_DENIED" });
  });

  it("should throw WALLET_NOT_FOUND when wallet does not exist", async () => {
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
    await expect(
      payInvoice({ creditCardId: card.id, invoiceId: "inv-1", walletId: "non-existent-wallet", userId }),
    ).rejects.toMatchObject({ code: "WALLET_NOT_FOUND" });
  });

  it("should throw WALLET_ACCESS_DENIED when user does not own the wallet", async () => {
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

    const userId = "user-1";
    const wallet = await walletRepo.create(makeFakeWallet({ userId: "wallet-owner" }));
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
    await expect(
      payInvoice({ creditCardId: card.id, invoiceId: "inv-1", walletId: wallet.id, userId }),
    ).rejects.toMatchObject({ code: "WALLET_ACCESS_DENIED" });
  });

  it("should auto-create the 'Pagamento de Fatura' system category and link it to the payment transaction", async () => {
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

    // Act
    await payInvoice({ creditCardId: card.id, invoiceId: "inv-1", walletId: wallet.id, userId });

    // Assert
    expect(categoryRepo.items).toHaveLength(1);
    expect(categoryRepo.items[0]!.name).toBe("Pagamento de Fatura");
    expect(categoryRepo.items[0]!.isSystem).toBe(true);
    expect(categoryRepo.items[0]!.systemId).toBe("CREDIT_CARD_PAYMENT");
    expect(cardRepo.paymentTransactions[0]!.categoryId).toBe(categoryRepo.items[0]!.id);
  });

  it("should reuse the existing system category on subsequent payments instead of creating duplicates", async () => {
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

    const userId = "user-1";
    const wallet = await walletRepo.create(makeFakeWallet({ userId, initialBalance: 2000 }));
    const card = await cardRepo.create(makeFakeCreditCard({ userId }));
    cardRepo.invoices.push({
      id: "inv-1",
      creditCardId: card.id,
      totalAmount: 200,
      paidAmount: 0,
      paid: false,
      deletedAt: null,
    });

    await payInvoice({ creditCardId: card.id, invoiceId: "inv-1", walletId: wallet.id, userId });

    cardRepo.invoices.push({
      id: "inv-2",
      creditCardId: card.id,
      totalAmount: 150,
      paidAmount: 0,
      paid: false,
      deletedAt: null,
    });

    // Act
    await payInvoice({ creditCardId: card.id, invoiceId: "inv-2", walletId: wallet.id, userId });

    // Assert — only one system category exists, reused across both payments
    expect(categoryRepo.items).toHaveLength(1);
    expect(cardRepo.paymentTransactions).toHaveLength(2);
    expect(cardRepo.paymentTransactions[1]!.categoryId).toBe(categoryRepo.items[0]!.id);
  });
});
