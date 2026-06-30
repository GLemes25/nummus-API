# Arquitetura da API — Nummus

## Paradigma

**Zero Classes.** A palavra reservada `class` é estritamente proibida em qualquer parte do código de negócio. Todo o sistema é construído com funções puras, funções assíncronas, closures e objetos literais.

---

## Estrutura de Pastas — Screaming Architecture (Vertical Slicing)

A estrutura de pastas grita o domínio de negócio, não o padrão técnico.

```
src/
├── shared/               # Infraestrutura transversal (nunca contém regra de negócio)
│   ├── http/
│   │   └── server.ts     # buildApp(): factory que cria e configura o Fastify
│   └── lib/
│       ├── auth.ts       # Instância do Better Auth
│       ├── env.ts        # Variáveis de ambiente validadas com Zod
│       └── prisma.ts     # Instância singleton do PrismaClient
│
├── modules/              # Cada pasta = um domínio de negócio isolado
│   └── <dominio>/
│       ├── dtos/
│       │   └── <acao>-<dominio>.dto.ts
│       ├── repositories/
│       │   └── <dominio>.repository.ts
│       ├── use-cases/
│       │   └── <acao>-<dominio>.use-case.ts
│       └── http/
│           ├── presenters/
│           │   └── <dominio>.presenter.ts
│           └── <dominio>.routes.ts
│
└── server.ts             # Entry point: importa buildApp() e chama app.listen()
```

**Regra absoluta:** nenhum arquivo de um módulo importa de outro módulo diretamente. Dependências entre domínios são resolvidas via injeção de dependência.

---

## Camadas por Arquivo

### 1. DTO (`dtos/<acao>-<dominio>.dto.ts`)

Valida e tipifica dados de entrada e saída via Zod. Exporta schemas e tipos inferidos.

```ts
import { z } from "zod";

export const createWalletSchema = z.object({
  name: z.string().min(1),
  currency: z.string().default("BRL"),
  initialBalance: z.number().default(0),
});

export type CreateWalletDto = z.infer<typeof createWalletSchema>;

export const walletResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  currency: z.string(),
  initialBalance: z.number(),
  balance: z.number(),
  isArchived: z.boolean(),
  userId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type WalletResponseDto = z.infer<typeof walletResponseSchema>;
```

- **Nunca** contém lógica de negócio.
- **Sempre** exporta o schema Zod e o `type` inferido.
- Schemas de resposta (`<dominio>ResponseSchema`) são definidos **aqui**, não na rota.
- O nome do schema de entrada segue `<acao><Dominio>Schema`; o de resposta segue `<dominio>ResponseSchema`.

---

### 2. Repository (`repositories/<dominio>.repository.ts`)

Único ponto de contato com o banco. Executa queries Prisma. Sem lógica de negócio.

```ts
import { prisma } from "../../../shared/lib/prisma.js";
import type { CreateWalletDto } from "../dtos/create-wallet.dto.js";

type CreateWalletInput = CreateWalletDto & { userId: string };

export const walletRepository = {
  create: async (data: CreateWalletInput) => { ... },
  findManyByUser: async (userId: string) => { ... },
};
```

- Exporta um **objeto literal** (`walletRepository`) — nunca uma classe.
- Sempre filtra `deletedAt: null` em queries de listagem (soft delete).
- Campos `Decimal` do Prisma são retornados como estão — a conversão para `number` é responsabilidade do Presenter.
- Nomenclatura dos métodos: `create`, `findById`, `findManyByUser`, `update`, `softDelete`.

---

### 3. Use Case (`use-cases/<acao>-<dominio>.use-case.ts`)

Contém a regra de negócio. Recebe o repositório via **Injeção de Dependência Funcional** (factory function), tornando-o testável sem banco.

```ts
import type { walletRepository } from "../repositories/wallet.repository.js";
import type { CreateWalletDto } from "../dtos/create-wallet.dto.js";

type WalletRepository = typeof walletRepository;
type CreateWalletInput = CreateWalletDto & { userId: string };

export const makeCreateWalletUseCase = (repository: WalletRepository) => {
  return async (data: CreateWalletInput) => {
    if (data.initialBalance < 0) {
      throw new Error("Initial balance cannot be negative");
    }
    return repository.create(data);
  };
};
```

- Exporta uma **factory function** com prefixo `make` → `make<Acao><Dominio>UseCase`.
- A factory recebe o repositório e retorna a função assíncrona que executa a lógica.
- O tipo do repositório é derivado via `typeof`, nunca declarado manualmente.
- **Nunca** importa `prisma` diretamente — acessa o banco apenas através do repositório injetado.

---

### 4. Presenter (`http/presenters/<dominio>.presenter.ts`)

Transforma a entidade retornada pelo Use Case no formato esperado pela resposta HTTP. Único responsável pela conversão de `Decimal` → `number` e pelo mapeamento de campos.

```ts
import type { Wallet } from "@prisma/client";
import type { WalletResponseDto } from "../../dtos/create-wallet.dto.js";

export const presentWallet = (wallet: Wallet): WalletResponseDto => ({
  id: wallet.id,
  name: wallet.name,
  currency: wallet.currency,
  initialBalance: Number(wallet.initialBalance),
  balance: Number(wallet.balance),
  isArchived: wallet.isArchived,
  userId: wallet.userId,
  createdAt: wallet.createdAt,
  updatedAt: wallet.updatedAt,
});
```

- Exporta uma **função pura** com prefixo `present` → `present<Dominio>`.
- Tipagem de entrada via tipo do Prisma (`Wallet`); tipagem de saída via `<Dominio>ResponseDto` do DTO.
- **Nunca** contém lógica de negócio — apenas mapeamento e conversão de tipos.
- **Zero classes**, **zero efeitos colaterais**.

---

### 5. Rota (`http/<dominio>.routes.ts`)

Mapeia HTTP para use cases. Instancia o use case com o repositório real, define os schemas Swagger e usa o Presenter para formatar a resposta.

```ts
export const walletRoutes = async (app: FastifyInstance) => {
  const createWallet = makeCreateWalletUseCase(walletRepository);

  app.withTypeProvider<ZodTypeProvider>().route({
    method: "POST",
    url: "/",
    schema: {
      tags: ["Wallets"],
      body: createWalletSchema,
      response: { 201: walletResponseSchema },
    },
    handler: async (request, reply) => {
      const wallet = await createWallet({ ...request.body, userId });
      return reply.status(201).send(presentWallet(wallet));
    },
  });
};
```

- Exporta uma **função assíncrona** com sufixo `Routes` → `<dominio>Routes`.
- **Sempre** usa `app.withTypeProvider<ZodTypeProvider>().route(...)`.
- **Sempre** define `tags`, `body` e `response` no `schema` para o Swagger.
- O schema de resposta é importado do DTO (`walletResponseSchema`), nunca declarado inline na rota.
- A formatação da resposta é delegada ao Presenter (`presentWallet(wallet)`).

---

## Registro de Rotas no Servidor

Toda nova rota é registrada em `src/shared/http/server.ts` dentro de `buildApp()`:

```ts
await app.register(walletRoutes, { prefix: "/wallets" });
```

O prefixo é sempre o nome do domínio no plural em kebab-case.

---

## Nomenclatura

| Artefato | Padrão | Exemplo |
|---|---|---|
| Pasta do módulo | `kebab-case` plural | `wallets/`, `credit-cards/` |
| Arquivo DTO | `<acao>-<dominio>.dto.ts` | `create-wallet.dto.ts` |
| Arquivo Repository | `<dominio>.repository.ts` | `wallet.repository.ts` |
| Arquivo Use Case | `<acao>-<dominio>.use-case.ts` | `create-wallet.use-case.ts` |
| Arquivo Presenter | `<dominio>.presenter.ts` | `wallet.presenter.ts` |
| Arquivo Routes | `<dominio>.routes.ts` | `wallet.routes.ts` |
| Export DTO schema (entrada) | `<acao><Dominio>Schema` | `createWalletSchema` |
| Export DTO schema (saída) | `<dominio>ResponseSchema` | `walletResponseSchema` |
| Export DTO type (entrada) | `<Acao><Dominio>Dto` | `CreateWalletDto` |
| Export DTO type (saída) | `<Dominio>ResponseDto` | `WalletResponseDto` |
| Export Repository | `<dominio>Repository` | `walletRepository` |
| Export Use Case factory | `make<Acao><Dominio>UseCase` | `makeCreateWalletUseCase` |
| Export Presenter | `present<Dominio>` | `presentWallet` |
| Export Routes | `<dominio>Routes` | `walletRoutes` |

---

## Fluxo Completo de um Novo Módulo

Ao criar um novo domínio (ex: `transactions`), seguir **sempre** esta ordem:

1. Criar `src/modules/transactions/dtos/create-transaction.dto.ts` (schema de entrada + schema de resposta)
2. Criar `src/modules/transactions/repositories/transaction.repository.ts`
3. Criar `src/modules/transactions/use-cases/create-transaction.use-case.ts`
4. Criar `src/modules/transactions/http/presenters/transaction.presenter.ts`
5. Criar `src/modules/transactions/http/transaction.routes.ts`
6. Registrar em `src/shared/http/server.ts`

---

## Injeção de Dependência

O projeto usa **DI Funcional** — sem containers, sem decorators, sem frameworks de DI.

- O use case **não conhece** o repositório concreto, apenas seu tipo (`typeof walletRepository`).
- A rota faz o "wiring": `makeCreateWalletUseCase(walletRepository)`.
- Em testes, basta passar um repositório mock: `makeCreateWalletUseCase(mockRepository)`.

---

## Soft Delete

Todos os modelos com dados de usuário possuem `deletedAt DateTime?` no Prisma.

- Queries de listagem **sempre** filtram `deletedAt: null`.
- Nunca usar `DELETE` do Prisma em entidades de domínio — usar `update({ data: { deletedAt: new Date() } })`.

---

## Tipos e Validação

- **Sempre** usar `type` — nunca `interface`.
- Schemas de entrada e de resposta validados com **Zod** no DTO.
- **Nunca** declarar schemas de resposta inline na rota — importar do DTO.
- **Nunca** usar `any`. Se necessário, justificar com comentário inline.
- Campos `Decimal` do Prisma são convertidos com `Number()` **exclusivamente no Presenter**.
