import { describe, it, expect } from "vitest";
import { faker } from "@faker-js/faker";
import { makeUpdateWalletUseCase } from "../../../src/modules/wallets/use-cases/update-wallet.use-case.js";
import { makeInMemoryWalletRepository } from "../../repositories/in-memory-wallet.repository.js";
import { makeFakeWallet } from "../../factories/wallet.factory.js";

describe("makeUpdateWalletUseCase", () => {
  it("should update only the requested field and return the modified wallet", async () => {
    // Arrange
    const repo = makeInMemoryWalletRepository();
    const updateWallet = makeUpdateWalletUseCase(repo as any);
    const userId = faker.string.uuid();
    const wallet = await repo.create(makeFakeWallet({ userId, name: "Original Name" }));

    // Act
    const updatedWallet = await updateWallet({
      walletId: wallet.id,
      userId,
      data: { name: "Updated Name" },
    });

    // Assert
    expect(updatedWallet?.name).toBe("Updated Name");
    expect(updatedWallet?.currency).toBe(wallet.currency);
  });

  it("should throw WALLET_ALREADY_EXISTS when renaming to a name already used by the same user", async () => {
    // Arrange
    const repo = makeInMemoryWalletRepository();
    const updateWallet = makeUpdateWalletUseCase(repo as any);
    const userId = faker.string.uuid();
    await repo.create(makeFakeWallet({ userId, name: "Existing Name" }));
    const wallet = await repo.create(makeFakeWallet({ userId, name: "My Wallet" }));

    // Act & Assert
    await expect(
      updateWallet({ walletId: wallet.id, userId, data: { name: "Existing Name" } })
    ).rejects.toMatchObject({
      code: "WALLET_ALREADY_EXISTS",
      message: "Já existe uma carteira com este nome",
      statusCode: 409,
    });
  });

  it("should throw WALLET_NOT_FOUND when the wallet does not exist", async () => {
    // Arrange
    const repo = makeInMemoryWalletRepository();
    const updateWallet = makeUpdateWalletUseCase(repo as any);

    // Act & Assert
    await expect(
      updateWallet({ walletId: faker.string.uuid(), userId: faker.string.uuid(), data: { name: "Anything" } })
    ).rejects.toMatchObject({
      code: "WALLET_NOT_FOUND",
      statusCode: 404,
    });
  });

  it("should throw WALLET_ACCESS_DENIED when the wallet belongs to another user", async () => {
    // Arrange
    const repo = makeInMemoryWalletRepository();
    const updateWallet = makeUpdateWalletUseCase(repo as any);
    const ownerId = faker.string.uuid();
    const otherUserId = faker.string.uuid();
    const wallet = await repo.create(makeFakeWallet({ userId: ownerId }));

    // Act & Assert
    await expect(
      updateWallet({ walletId: wallet.id, userId: otherUserId, data: { name: "New Name" } })
    ).rejects.toMatchObject({
      code: "WALLET_ACCESS_DENIED",
      statusCode: 403,
    });
  });
});
