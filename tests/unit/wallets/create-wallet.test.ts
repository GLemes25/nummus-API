import { describe, it, expect } from "vitest";
import { makeCreateWalletUseCase } from "../../../src/modules/wallets/use-cases/create-wallet.use-case.js";
import { makeInMemoryWalletRepository } from "../../repositories/in-memory-wallet.repository.js";
import { makeFakeWallet } from "../../factories/wallet.factory.js";

describe("makeCreateWalletUseCase", () => {
  it("should create a wallet successfully", async () => {
    // Arrange
    const repo = makeInMemoryWalletRepository();
    const createWallet = makeCreateWalletUseCase(repo as any);
    const input = makeFakeWallet({ userId: "user-1", initialBalance: 500 });

    // Act
    const wallet = await createWallet(input);

    // Assert
    expect(wallet.name).toBe(input.name);
    expect(wallet.currency).toBe(input.currency);
    expect(wallet.balance).toBe(input.initialBalance);
    expect(wallet.initialBalance).toBe(input.initialBalance);
    expect(repo.items).toHaveLength(1);
  });

  it("should throw when creating a wallet with a duplicated name for the same user", async () => {
    // Arrange
    const repo = makeInMemoryWalletRepository();
    const createWallet = makeCreateWalletUseCase(repo as any);
    const userId = "user-1";
    const input = makeFakeWallet({ userId, name: "My Savings" });

    await createWallet(input);

    // Act & Assert
    await expect(createWallet(input)).rejects.toMatchObject({
      code: "WALLET_ALREADY_EXISTS",
      message: "Já existe uma carteira com este nome",
    });
    expect(repo.items).toHaveLength(1);
  });

  it("should allow wallets with the same name for different users", async () => {
    // Arrange
    const repo = makeInMemoryWalletRepository();
    const createWallet = makeCreateWalletUseCase(repo as any);
    const walletName = "Shared Name";

    // Act
    await createWallet(makeFakeWallet({ userId: "user-1", name: walletName }));
    await createWallet(makeFakeWallet({ userId: "user-2", name: walletName }));

    // Assert
    expect(repo.items).toHaveLength(2);
  });

  it("should throw when initial balance is negative", async () => {
    // Arrange
    const repo = makeInMemoryWalletRepository();
    const createWallet = makeCreateWalletUseCase(repo as any);
    const input = makeFakeWallet({ initialBalance: -100 });

    // Act & Assert
    await expect(createWallet(input)).rejects.toMatchObject({
      code: "INVALID_INITIAL_BALANCE",
      message: "O saldo inicial não pode ser negativo",
    });
  });
});
