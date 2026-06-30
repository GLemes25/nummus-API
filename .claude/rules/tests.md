# Diretrizes de Testes — Nummus API

## Stack de Testes

- **Test Runner**: Vitest
- **Dados Falsos**: `@faker-js/faker`
- **Paradigma**: Testes unitários com repositórios em memória

---

## Princípios Fundamentais

### 1. Repositórios Em Memória (In-Memory Repositories)

Nunca use o banco de dados real ou mocks de biblioteca (ex: `vi.mock`) para testar Use Cases. Ao invés disso, implemente **repositórios em memória** que seguem exatamente o mesmo contrato dos repositórios reais.

- Repositórios em memória ficam em `tests/repositories/`
- Nomeados como `in-memory-<dominio>.repository.ts`
- Implementados com **closures** e **arrays internos** — zero classes
- Expõem o array `items` publicamente para que os testes possam inspecionar o estado

```ts
export const makeInMemoryWalletRepository = () => {
  const items: InMemoryWallet[] = [];

  return {
    items,
    create: async (data) => { ... },
    findById: async (id) => { ... },
  };
};
```

### 2. Padrão AAA (Arrange, Act, Assert)

Todo teste deve ser estruturado em três seções claramente separadas:

```ts
it("should create a wallet successfully", async () => {
  // Arrange
  const repo = makeInMemoryWalletRepository();
  const createWallet = makeCreateWalletUseCase(repo as any);
  const input = makeFakeWallet({ userId: "user-1" });

  // Act
  const wallet = await createWallet(input);

  // Assert
  expect(wallet.name).toBe(input.name);
  expect(repo.items).toHaveLength(1);
});
```

### 3. Factories de Dados (Data Factories)

Use `@faker-js/faker` para gerar dados aleatórios e realistas. Factories ficam em `tests/factories/`.

- Nomeadas como `<dominio>.factory.ts`
- Exportam funções puras com prefixo `makeFake` → `makeFakeWallet`, `makeFakeCategory`, `makeFakeTransaction`
- Aceitam um parâmetro opcional `Partial<T>` para sobrescrever campos específicos

```ts
export const makeFakeWallet = (overrides: Partial<...> = {}) => ({
  name: faker.finance.accountName(),
  currency: "BRL",
  initialBalance: 0,
  userId: faker.string.uuid(),
  ...overrides,
});
```

---

## Estrutura de Pastas

```
tests/
├── factories/         # Factories de dados falsos com @faker-js/faker
│   ├── wallet.factory.ts
│   ├── category.factory.ts
│   └── transaction.factory.ts
├── repositories/      # Implementações em memória dos repositórios
│   ├── in-memory-wallet.repository.ts
│   ├── in-memory-category.repository.ts
│   └── in-memory-transaction.repository.ts
└── unit/              # Testes unitários por domínio
    ├── wallets/
    ├── categories/
    └── transactions/
```

---

## Idioma e Nomenclatura

- Todo o código-fonte dos testes (variáveis, funções, tipos) deve estar em **Inglês**
- Descrições do Vitest (`describe`, `it`) devem estar em **Inglês**
- Apenas este arquivo de diretrizes fica em Português

---

## Regras de Arquitetura nos Testes

- **Zero classes** — o uso de `class` é estritamente proibido nos arquivos de teste e utilitários
- Use `as any` ou `as unknown as T` para contornar incompatibilidades de tipos do Prisma (`Decimal`) nos testes — isso é aceitável e esperado
- Repositórios em memória compartilham o array `items` via referência para permitir verificações de estado após operações atômicas (ex: criação de transação + atualização de saldo)
- Cada teste deve ser **isolado**: crie novas instâncias dos repositórios por teste (usando `beforeEach` quando necessário)

---

## Injeção de Dependência nos Testes

Use Cases recebem seus repositórios via DI funcional. Nos testes, injete sempre os repositórios em memória:

```ts
const walletRepo = makeInMemoryWalletRepository();
const transactionRepo = makeInMemoryTransactionRepository(walletRepo.items);

const createTransaction = makeCreateTransactionUseCase(
  transactionRepo as any,
  (id) => walletRepo.findById(id),  // findWallet
  (id) => categoryRepo.findById(id), // findCategory
  async () => null,                   // findCreditCard (não testado)
);
```
