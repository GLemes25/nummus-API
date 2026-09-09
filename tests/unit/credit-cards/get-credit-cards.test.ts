import { describe, it, expect, beforeEach } from "vitest";
import { faker } from "@faker-js/faker";
import { makeGetCreditCardsUseCase } from "../../../src/modules/credit-cards/use-cases/get-credit-cards.use-case.js";
import { makeInMemoryCreditCardRepository } from "../../repositories/in-memory-credit-card.repository.js";
import { makeFakeCreditCard } from "../../factories/credit-card.factory.js";

describe("makeGetCreditCardsUseCase", () => {
  let repo: ReturnType<typeof makeInMemoryCreditCardRepository>;
  let getCreditCards: ReturnType<typeof makeGetCreditCardsUseCase>;

  beforeEach(() => {
    repo = makeInMemoryCreditCardRepository();
    getCreditCards = makeGetCreditCardsUseCase(repo as any);
  });

  it("should return an empty array when the user has no credit cards", async () => {
    // Arrange — no cards added

    // Act
    const result = await getCreditCards(faker.string.uuid());

    // Assert
    expect(result).toEqual([]);
  });

  it("should return credit cards with currentInvoiceAmount summed from unpaid invoices", async () => {
    // Arrange
    const userId = faker.string.uuid();
    const card = await repo.create(makeFakeCreditCard({ userId }));
    repo.invoices.push({ id: faker.string.uuid(), creditCardId: card.id, totalAmount: 200, paidAmount: 0, paid: false, deletedAt: null });
    repo.invoices.push({ id: faker.string.uuid(), creditCardId: card.id, totalAmount: 150, paidAmount: 0, paid: false, deletedAt: null });

    // Act
    const result = await getCreditCards(userId);

    // Assert
    expect(result).toHaveLength(1);
    expect(result[0]!.currentInvoiceAmount).toBe(350);
    expect(result[0]!.creditCard.id).toBe(card.id);
  });

  it("should return currentInvoiceAmount as 0 when there are no open invoices", async () => {
    // Arrange
    const userId = faker.string.uuid();
    await repo.create(makeFakeCreditCard({ userId }));

    // Act
    const result = await getCreditCards(userId);

    // Assert
    expect(result).toHaveLength(1);
    expect(result[0]!.currentInvoiceAmount).toBe(0);
  });

  it("should not count paid invoices in currentInvoiceAmount", async () => {
    // Arrange
    const userId = faker.string.uuid();
    const card = await repo.create(makeFakeCreditCard({ userId }));
    repo.invoices.push({ id: faker.string.uuid(), creditCardId: card.id, totalAmount: 500, paidAmount: 0, paid: true, deletedAt: null });
    repo.invoices.push({ id: faker.string.uuid(), creditCardId: card.id, totalAmount: 100, paidAmount: 0, paid: false, deletedAt: null });

    // Act
    const result = await getCreditCards(userId);

    // Assert
    expect(result[0]!.currentInvoiceAmount).toBe(100);
  });

  it("should not return credit cards belonging to another user", async () => {
    // Arrange
    const userA = faker.string.uuid();
    const userB = faker.string.uuid();
    await repo.create(makeFakeCreditCard({ userId: userA }));
    await repo.create(makeFakeCreditCard({ userId: userB }));

    // Act
    const result = await getCreditCards(userA);

    // Assert
    expect(result).toHaveLength(1);
    expect(result[0]!.creditCard.userId).toBe(userA);
  });

  it("should not return soft-deleted credit cards", async () => {
    // Arrange
    const userId = faker.string.uuid();
    await repo.create(makeFakeCreditCard({ userId }));
    repo.items[0]!.deletedAt = new Date();

    // Act
    const result = await getCreditCards(userId);

    // Assert
    expect(result).toHaveLength(0);
  });
});
