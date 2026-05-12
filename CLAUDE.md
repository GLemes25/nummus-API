# Nummus API — Regras de Desenvolvimento

## Idioma

- **Documentação técnica** (comentários, nomes de variáveis, arquivos de regras): **Português**
- **Mensagens de commit**: **Inglês** (padrão convencional, ex: `feat: add transaction routes`)

## Paradigma Arquitetural

- **Proibido o uso de `class`** em qualquer parte do código de negócio.
- Todos os _use cases_, controladores e utilitários devem ser **funções puras ou assíncronas**:
  ```ts
  export const createTransaction = async (...) => { ... }
  ```

## Stack

- **Runtime**: Node.js + TypeScript
- **Framework HTTP**: Fastify com `fastify-type-provider-zod`
- **Validação**: Zod (schemas em `src/schemas/`)
- **ORM**: Prisma com PostgreSQL
- **Autenticação**: Better Auth

## Estrutura de Pastas

```
src/
  routes/      # Definição das rotas Fastify
  usecases/    # Lógica de negócio (funções puras/assíncronas)
  schemas/     # Schemas Zod reutilizáveis
  lib/         # Instâncias singleton (prisma, auth, env)
prisma/
  schema.prisma
```

## Nota de UI para Clientes da API

Todas as interfaces focadas (modais, pop-ups, janelas ativas) devem aplicar uma **opacidade de 90%**, garantindo que o contexto da aplicação (dashboard) continue visível ao fundo.
