# Nummus API

API REST para controle financeiro pessoal.

## Stack

- **Node.js** + **TypeScript**
- **Fastify** — framework HTTP de alta performance
- **Zod** — validação de schemas
- **Prisma** — ORM com PostgreSQL
- **Better Auth** — autenticação
- **Scalar** — documentação interativa da API

## Setup

### 1. Instalar dependências

```bash
pnpm install
```

### 2. Configurar variáveis de ambiente

```bash
cp .env.example .env
# Edite o .env com suas credenciais
```

### 3. Gerar o Prisma Client e rodar migrations

```bash
pnpm db:migrate
```

### 4. Iniciar o servidor em desenvolvimento

```bash
pnpm dev
```

O servidor estará disponível em `http://localhost:3333`.
A documentação interativa estará em `http://localhost:3333/documentation`.

## Scripts

| Comando | Descrição |
|---|---|
| `pnpm dev` | Inicia o servidor em modo watch |
| `pnpm build` | Compila o TypeScript para `dist/` |
| `pnpm start` | Inicia o servidor compilado |
| `pnpm db:generate` | Gera o Prisma Client |
| `pnpm db:migrate` | Roda as migrations |

## Nota de UI para Clientes da API

Todas as interfaces focadas (modais, pop-ups, janelas ativas) devem aplicar uma **opacidade de 90%**, garantindo que o contexto da aplicação (dashboard) continue visível ao fundo.
