import { describe, it, expect, beforeEach } from "vitest";
import { faker } from "@faker-js/faker";
import { makeCreateTransactionUseCase } from "../../../src/modules/transactions/use-cases/create-transaction.use-case.js";
import { makeInMemoryWalletRepository } from "../../repositories/in-memory-wallet.repository.js";
import { makeInMemoryCategoryRepository } from "../../repositories/in-memory-category.repository.js";
import { makeInMemoryTransactionRepository } from "../../repositories/in-memory-transaction.repository.js";
import { makeFakeWallet } from "../../factories/wallet.factory.js";
import { makeFakeCategory } from "../../factories/category.factory.js";
import { makeFakeCreditCard } from "../../factories/credit-card.factory.js";

describe("makeCreateTransactionUseCase — installments", () => {
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

  it("should generate 3 records of R$200 with sequential months for a R$600 3x installment", async () => {
    // Arrange
    const userId = faker.string.uuid();
    const wallet = await walletRepo.create(makeFakeWallet({ userId, initialBalance: 1000 }));
    const baseDate = new Date(2024, 7, 10); // August 10, 2024

    // Act
    await createTransaction({
      userId,
      walletId: wallet.id,
      type: "EXPENSE",
      paymentMethod: "CASH",
      amount: 600,
      date: baseDate,
      description: "Geladeira",
      installments: 3,
    });

    // Assert — 3 parcelas criadas
    expect(transactionRepo.items).toHaveLength(3);

    const [p1, p2, p3] = transactionRepo.items;

    // Valores iguais
    expect(p1!.amount).toBe(200);
    expect(p2!.amount).toBe(200);
    expect(p3!.amount).toBe(200);

    // Meses sequenciais (Ago, Set, Out)
    expect(p1!.date.getMonth()).toBe(7); // August
    expect(p2!.date.getMonth()).toBe(8); // September
    expect(p3!.date.getMonth()).toBe(9); // October

    // Dia preservado
    expect(p1!.date.getDate()).toBe(10);
    expect(p2!.date.getDate()).toBe(10);
    expect(p3!.date.getDate()).toBe(10);

    // Mesmo installmentId vinculando as 3 parcelas
    expect(p1!.installmentId).not.toBeNull();
    expect(p1!.installmentId).toBe(p2!.installmentId);
    expect(p2!.installmentId).toBe(p3!.installmentId);

    // Números de parcela corretos
    expect(p1!.installmentNumber).toBe(1);
    expect(p2!.installmentNumber).toBe(2);
    expect(p3!.installmentNumber).toBe(3);
  });

  it("should update wallet balance only by the first installment amount", async () => {
    // Arrange
    const userId = faker.string.uuid();
    const wallet = await walletRepo.create(makeFakeWallet({ userId, initialBalance: 1000 }));

    // Act — R$600 em 3x: cada parcela = R$200
    await createTransaction({
      userId,
      walletId: wallet.id,
      type: "EXPENSE",
      paymentMethod: "CASH",
      amount: 600,
      date: new Date(2024, 7, 10),
      description: "Notebook",
      installments: 3,
    });

    // Assert — saldo decrementado apenas pela primeira parcela (200), não pelo total (600)
    const updatedWallet = walletRepo.items.find((w) => w.id === wallet.id);
    expect(updatedWallet?.balance).toBe(800);
  });

  it("should assign descriptions in the format 'description (N/total)' for each installment", async () => {
    // Arrange
    const userId = faker.string.uuid();
    const wallet = await walletRepo.create(makeFakeWallet({ userId, initialBalance: 500 }));

    // Act
    await createTransaction({
      userId,
      walletId: wallet.id,
      type: "EXPENSE",
      paymentMethod: "PIX",
      amount: 300,
      date: new Date(2024, 0, 15),
      description: "TV",
      installments: 3,
    });

    // Assert
    expect(transactionRepo.items[0]!.description).toBe("TV (1/3)");
    expect(transactionRepo.items[1]!.description).toBe("TV (2/3)");
    expect(transactionRepo.items[2]!.description).toBe("TV (3/3)");
  });

  it("should handle rounding so total amount is exact (last installment absorbs remainder)", async () => {
    // Arrange — R$100 em 3x: 33.33 + 33.33 + 33.34 = 100.00
    const userId = faker.string.uuid();
    const wallet = await walletRepo.create(makeFakeWallet({ userId, initialBalance: 500 }));

    // Act
    await createTransaction({
      userId,
      walletId: wallet.id,
      type: "EXPENSE",
      paymentMethod: "CASH",
      amount: 100,
      date: new Date(2024, 7, 1),
      description: "Parcela com centavo",
      installments: 3,
    });

    // Assert
    const total = transactionRepo.items.reduce((sum, t) => sum + t.amount, 0);
    expect(Math.round(total * 100) / 100).toBe(100);
    expect(transactionRepo.items[0]!.amount).toBe(33.33);
    expect(transactionRepo.items[1]!.amount).toBe(33.33);
    expect(transactionRepo.items[2]!.amount).toBe(33.34);
  });

  it("should handle installments=1 as a regular single transaction", async () => {
    // Arrange
    const userId = faker.string.uuid();
    const wallet = await walletRepo.create(makeFakeWallet({ userId, initialBalance: 500 }));

    // Act
    await createTransaction({
      userId,
      walletId: wallet.id,
      type: "EXPENSE",
      paymentMethod: "CASH",
      amount: 200,
      date: new Date(2024, 7, 1),
      description: "Único",
      installments: 1,
    });

    // Assert — apenas 1 transação, sem installmentId
    expect(transactionRepo.items).toHaveLength(1);
    expect(transactionRepo.items[0]!.installmentId).toBeNull();
    expect(transactionRepo.items[0]!.installmentNumber).toBeNull();
  });

  it("should generate credit card installments each linked to their respective month's invoice", async () => {
    // Arrange
    const userId = faker.string.uuid();
    const creditCard = { id: faker.string.uuid(), closingDay: 10, dueDay: 5, userId };
    creditCards.push(creditCard);
    const baseDate = new Date(2024, 7, 15); // August 15 (after closing day 10 → current period)

    // Act
    await createTransaction({
      userId,
      walletId: undefined,
      creditCardId: creditCard.id,
      type: "EXPENSE",
      paymentMethod: "CREDIT",
      amount: 600,
      date: baseDate,
      description: "iPhone",
      installments: 3,
    });

    // Assert — 3 parcelas de R$200, cada uma em uma fatura diferente
    expect(transactionRepo.items).toHaveLength(3);
    expect(transactionRepo.invoices).toHaveLength(3); // uma fatura por mês

    const [p1, p2, p3] = transactionRepo.items;
    expect(p1!.amount).toBe(200);
    expect(p2!.amount).toBe(200);
    expect(p3!.amount).toBe(200);

    // Cada parcela em uma fatura distinta
    expect(p1!.invoiceId).not.toBe(p2!.invoiceId);
    expect(p2!.invoiceId).not.toBe(p3!.invoiceId);

    // Todos compartilham o mesmo installmentId
    expect(p1!.installmentId).toBe(p2!.installmentId);
    expect(p2!.installmentId).toBe(p3!.installmentId);
  });

  it("should mark the first installment as COMPLETED and installments 2..N as PENDING", async () => {
    // Arrange
    const userId = faker.string.uuid();
    const wallet = await walletRepo.create(makeFakeWallet({ userId, initialBalance: 1000 }));

    // Act
    await createTransaction({
      userId,
      walletId: wallet.id,
      type: "EXPENSE",
      paymentMethod: "CASH",
      amount: 600,
      date: new Date(2024, 7, 10),
      description: "Sofá",
      installments: 3,
    });

    // Assert
    const [p1, p2, p3] = transactionRepo.items;
    expect(p1!.status).toBe("COMPLETED");
    expect(p2!.status).toBe("PENDING");
    expect(p3!.status).toBe("PENDING");
  });

  it("should set each credit card installment's date to its own invoice's closing date instead of the raw purchase-anniversary date", async () => {
    // Arrange
    const userId = faker.string.uuid();
    const creditCard = { id: faker.string.uuid(), closingDay: 10, dueDay: 5, userId };
    creditCards.push(creditCard);
    // Aug 15 (after closing day 10) → 1ª parcela cai no fechamento de Set/10
    const baseDate = new Date(2024, 7, 15);

    // Act
    await createTransaction({
      userId,
      walletId: undefined,
      creditCardId: creditCard.id,
      type: "EXPENSE",
      paymentMethod: "CREDIT",
      amount: 600,
      date: baseDate,
      description: "iPhone",
      installments: 3,
    });

    // Assert — cada parcela "ensacada" no fechamento (dia 10) do respectivo mês da fatura,
    // nunca no dia 15 (data nominal da compra/aniversário)
    const [p1, p2, p3] = transactionRepo.items;

    expect(p1!.date.getMonth()).toBe(8); // September
    expect(p1!.date.getDate()).toBe(10);

    expect(p2!.date.getMonth()).toBe(9); // October
    expect(p2!.date.getDate()).toBe(10);

    expect(p3!.date.getMonth()).toBe(10); // November
    expect(p3!.date.getDate()).toBe(10);
  });

  it("should skip months safely when date falls on the last day of a short month", async () => {
    // Arrange — Janeiro 31: +1 mês = Fevereiro (sem dia 31), deve ir para Feb 28
    const userId = faker.string.uuid();
    const wallet = await walletRepo.create(makeFakeWallet({ userId, initialBalance: 1000 }));

    // Act
    await createTransaction({
      userId,
      walletId: wallet.id,
      type: "EXPENSE",
      paymentMethod: "CASH",
      amount: 200,
      date: new Date(2024, 0, 31), // January 31
      description: "Produto",
      installments: 2,
    });

    // Assert — segunda parcela cai no último dia de Fevereiro (não pula para Março)
    expect(transactionRepo.items[1]!.date.getMonth()).toBe(1); // February
    expect(transactionRepo.items[1]!.date.getDate()).toBe(29); // 2024 is leap year
  });
});
