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
│           └── <dominio>.routes.ts
│
└── server.ts             # Entry point: importa buildApp() e chama app.listen()
```

**Regra absoluta:** nenhum arquivo de um módulo importa de outro módulo diretamente. Dependências entre domínios são resolvidas via injeção de dependência.

---

## Camadas por Arquivo

### 1. DTO (`dtos/<acao>-<dominio>.dto.ts`)

Valida e tipifica os dados de entrada via Zod. Exporta o schema e o tipo inferido.

```ts
import { z } from "zod";

export const createWalletSchema = z.object({
  name: z.string().min(1),
  currency: z.string().default("BRL"),
  initialBalance: z.number().default(0),
});

export type CreateWalletDto = z.infer<typeof createWalletSchema>;
```

- **Nunca** contém lógica de negócio.
- **Sempre** exporta o schema Zod e o `type` inferido.
- O nome do schema exportado segue o padrão `<acao><Dominio>Schema` (camelCase).

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
- Campos `Decimal` do Prisma são retornados como estão — a conversão para `number` é feita na rota.
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

### 4. Rota (`http/<dominio>.routes.ts`)

Mapeia HTTP para use cases. Instancia o use case com o repositório real e define os schemas Swagger.

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
      return reply.status(201).send({
        ...wallet,
        initialBalance: Number(wallet.initialBalance),
        balance: Number(wallet.balance),
      });
    },
  });
};
```

- Exporta uma **função assíncrona** com sufixo `Routes` → `<dominio>Routes`.
- **Sempre** usa `app.withTypeProvider<ZodTypeProvider>().route(...)`.
- **Sempre** define `tags`, `body` e `response` no `schema` para o Swagger.
- Converte campos `Decimal` do Prisma para `number` com `Number()` antes de enviar.
- O `schema` de resposta é definido localmente na rota como `const <dominio>ResponseSchema`.

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
| Arquivo Routes | `<dominio>.routes.ts` | `wallet.routes.ts` |
| Export DTO schema | `<acao><Dominio>Schema` | `createWalletSchema` |
| Export DTO type | `<Acao><Dominio>Dto` | `CreateWalletDto` |
| Export Repository | `<dominio>Repository` | `walletRepository` |
| Export Use Case factory | `make<Acao><Dominio>UseCase` | `makeCreateWalletUseCase` |
| Export Routes | `<dominio>Routes` | `walletRoutes` |

---

## Fluxo Completo de um Novo Módulo

Ao criar um novo domínio (ex: `transactions`), seguir **sempre** esta ordem:

1. Criar `src/modules/transactions/dtos/create-transaction.dto.ts`
2. Criar `src/modules/transactions/repositories/transaction.repository.ts`
3. Criar `src/modules/transactions/use-cases/create-transaction.use-case.ts`
4. Criar `src/modules/transactions/http/transaction.routes.ts`
5. Registrar em `src/shared/http/server.ts`

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
- Schemas de entrada validados com **Zod** no DTO.
- Schemas de resposta definidos com **Zod** diretamente na rota.
- **Nunca** usar `any`. Se necessário, justificar com comentário inline.
- Campos `Decimal` do Prisma são sempre convertidos com `Number()` antes de retornar na resposta HTTP.
