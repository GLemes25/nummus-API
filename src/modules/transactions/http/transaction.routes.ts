import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";

import { verifyAuth } from "../../../shared/http/hooks/verify-auth.js";
import { createTransactionSchema, transactionResponseSchema } from "../dtos/create-transaction.dto.js";
import { transactionRepository } from "../repositories/transaction.repository.js";
import { makeCreateTransactionUseCase } from "../use-cases/create-transaction.use-case.js";
import { presentTransaction } from "./presenters/transaction.presenter.js";

type FindWallet = (id: string) => Promise<{ balance: { toNumber: () => number } } | null>;
type FindCategory = (id: string) => Promise<{ id: string } | null>;

type TransactionRouteDeps = {
  findWallet: FindWallet;
  findCategory: FindCategory;
};

export const transactionRoutes =
  (deps: TransactionRouteDeps) => async (app: FastifyInstance) => {
    const createTransaction = makeCreateTransactionUseCase(
      transactionRepository,
      deps.findWallet,
      deps.findCategory
    );

    app.withTypeProvider<ZodTypeProvider>().route({
      method: "POST",
      url: "/",
      preHandler: [verifyAuth],
      schema: {
        tags: ["Transactions"],
        body: createTransactionSchema,
        response: {
          201: transactionResponseSchema,
        },
      },
      handler: async (request, reply) => {
        const userId = request.userId;
        const transaction = await createTransaction({ ...request.body, userId });
        return reply.status(201).send(presentTransaction(transaction));
      },
    });
  };
