import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { ZodTypeProvider } from "fastify-type-provider-zod";

import { verifyAuth } from "../../../shared/http/hooks/verify-auth.js";
import { appErrorResponseSchema } from "../../../shared/errors/make-app-error.js";
import { createTransactionSchema, transactionResponseSchema } from "../dtos/create-transaction.dto.js";
import { getTransactionsSchema, getTransactionsResponseSchema } from "../dtos/get-transactions.dto.js";
import { transactionRepository } from "../repositories/transaction.repository.js";
import { makeCreateTransactionUseCase } from "../use-cases/create-transaction.use-case.js";
import { makeGetTransactionsUseCase } from "../use-cases/get-transactions.use-case.js";
import { makeDeleteTransactionUseCase } from "../use-cases/delete-transaction.use-case.js";
import { presentTransaction, presentTransactionListItem } from "./presenters/transaction.presenter.js";

type FindWallet = (id: string) => Promise<{ balance: { toNumber: () => number } } | null>;
type FindCategory = (id: string) => Promise<{ id: string } | null>;
type FindCreditCard = (id: string) => Promise<{ id: string; closingDay: number; dueDay: number } | null>;

type TransactionRouteDeps = {
  findWallet: FindWallet;
  findCategory: FindCategory;
  findCreditCard: FindCreditCard;
};

export const transactionRoutes =
  (deps: TransactionRouteDeps) => async (app: FastifyInstance) => {
    const createTransaction = makeCreateTransactionUseCase(
      transactionRepository,
      deps.findWallet,
      deps.findCategory,
      deps.findCreditCard
    );
    const getTransactions = makeGetTransactionsUseCase(transactionRepository);
    const deleteTransaction = makeDeleteTransactionUseCase(transactionRepository);

    app.withTypeProvider<ZodTypeProvider>().route({
      method: "GET",
      url: "/",
      preHandler: [verifyAuth],
      schema: {
        tags: ["Transactions"],
        querystring: getTransactionsSchema,
        response: {
          200: getTransactionsResponseSchema,
        },
      },
      handler: async (request, reply) => {
        const userId = request.userId;
        const result = await getTransactions({ ...request.query, userId });
        return reply.status(200).send({
          data: result.data.map(presentTransactionListItem),
          meta: result.meta,
        });
      },
    });

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

    app.withTypeProvider<ZodTypeProvider>().route({
      method: "DELETE",
      url: "/:id",
      preHandler: [verifyAuth],
      schema: {
        tags: ["Transactions"],
        params: z.object({ id: z.string() }),
        response: {
          204: z.void(),
          404: appErrorResponseSchema,
        },
      },
      handler: async (request, reply) => {
        await deleteTransaction({ transactionId: request.params.id, userId: request.userId });
        return reply.status(204).send();
      },
    });
  };
