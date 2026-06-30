import { describe, it, expect } from "vitest";
import { makeGetWalletsUseCase } from "../../../src/modules/wallets/use-cases/get-wallets.use-case.js";
import { makeCreateWalletUseCase } from "../../../src/modules/wallets/use-cases/create-wallet.use-case.js";
import { makeInMemoryWalletRepository } from "../../repositories/in-memory-wallet.repository.js";
import { makeFakeWallet } from "../../factories/wallet.factory.js";
import { faker } from "@faker-js/faker";

describe("makeGetWalletsUseCase", () => {
  it("should return only active wallets, ignoring archived and deleted ones", async () => {
    // Arrange
    const repo = makeInMemoryWalletRepository();
    const createWallet = makeCreateWalletUseCase(repo as any);
    const getWallets = makeGetWalletsUseCase(repo as any);
    const userId = faker.string.uuid();

    await createWallet(makeFakeWallet({ userId, name: "Active Wallet" }));
    await createWallet(makeFakeWallet({ userId, name: "Archived Wallet" }));
    await createWallet(makeFakeWallet({ userId, name: "Deleted Wallet" }));

    // Simulate archived and soft-deleted wallets
    repo.items[1]!.isArchived = true;
    repo.items[2]!.deletedAt = new Date();

    // Act
    const activeWallets = await getWallets({ userId, isArchived: false });

    // Assert
    expect(activeWallets).toHaveLength(1);
    expect(activeWallets[0]!.name).toBe("Active Wallet");
  });

  it("should return all non-deleted wallets when no isArchived filter is provided", async () => {
    // Arrange
    const repo = makeInMemoryWalletRepository();
    const createWallet = makeCreateWalletUseCase(repo as any);
    const getWallets = makeGetWalletsUseCase(repo as any);
    const userId = faker.string.uuid();

    await createWallet(makeFakeWallet({ userId, name: "Active Wallet" }));
    await createWallet(makeFakeWallet({ userId, name: "Archived Wallet" }));
    await createWallet(makeFakeWallet({ userId, name: "Deleted Wallet" }));

    repo.items[1]!.isArchived = true;
    repo.items[2]!.deletedAt = new Date();

    // Act
    const allWallets = await getWallets({ userId });

    // Assert — deleted wallet must not appear, but archived one should
    expect(allWallets).toHaveLength(2);
  });

  it("should return only archived wallets when isArchived is true", async () => {
    // Arrange
    const repo = makeInMemoryWalletRepository();
    const createWallet = makeCreateWalletUseCase(repo as any);
    const getWallets = makeGetWalletsUseCase(repo as any);
    const userId = faker.string.uuid();

    await createWallet(makeFakeWallet({ userId, name: "Active Wallet" }));
    await createWallet(makeFakeWallet({ userId, name: "Archived Wallet" }));

    repo.items[1]!.isArchived = true;

    // Act
    const archivedWallets = await getWallets({ userId, isArchived: true });

    // Assert
    expect(archivedWallets).toHaveLength(1);
    expect(archivedWallets[0]!.name).toBe("Archived Wallet");
  });
});
