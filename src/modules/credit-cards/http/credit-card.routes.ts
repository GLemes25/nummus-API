import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { ZodTypeProvider } from "fastify-type-provider-zod";

import { verifyAuth } from "../../../shared/http/hooks/verify-auth.js";
import { appErrorResponseSchema } from "../../../shared/errors/make-app-error.js";
import { createCreditCardSchema, creditCardResponseSchema } from "../dtos/create-credit-card.dto.js";
import { updateCreditCardSchema } from "../dtos/update-credit-card.dto.js";
import { payInvoiceSchema } from "../dtos/pay-invoice.dto.js";
import { creditCardRepository } from "../repositories/credit-card.repository.js";
import { makeCreateCreditCardUseCase } from "../use-cases/create-credit-card.use-case.js";
import { makeGetCreditCardsUseCase } from "../use-cases/get-credit-cards.use-case.js";
import { makeUpdateCreditCardUseCase } from "../use-cases/update-credit-card.use-case.js";
import { makeDeleteCreditCardUseCase } from "../use-cases/delete-credit-card.use-case.js";
import { makePayInvoiceUseCase } from "../use-cases/pay-invoice.use-case.js";
import { makeReopenInvoiceUseCase } from "../use-cases/reopen-invoice.use-case.js";
import { presentCreditCard } from "./presenters/credit-card.presenter.js";

type WalletSnapshot = { balance: { toNumber: () => number }; userId: string };
type FindWallet = (id: string) => Promise<WalletSnapshot | null>;
type CategorySnapshot = { id: string };
type FindCategoryBySystemId = (
  userId: string,
  systemId: string,
) => Promise<CategorySnapshot | null>;
type CreateSystemCategory = (data: {
  userId: string;
  systemId: string;
  name: string;
  icon: string;
  color: string;
}) => Promise<CategorySnapshot>;

type CreditCardRouteDeps = {
  findWallet: FindWallet;
  findCategoryBySystemId: FindCategoryBySystemId;
  createSystemCategory: CreateSystemCategory;
};

export const creditCardRoutes =
  ({ findWallet, findCategoryBySystemId, createSystemCategory }: CreditCardRouteDeps) =>
  async (app: FastifyInstance) => {
    const createCreditCard = makeCreateCreditCardUseCase(creditCardRepository, findWallet);
    const getCreditCards = makeGetCreditCardsUseCase(creditCardRepository);
    const updateCreditCard = makeUpdateCreditCardUseCase(creditCardRepository, findWallet);
    const deleteCreditCard = makeDeleteCreditCardUseCase(creditCardRepository);
    const payInvoice = makePayInvoiceUseCase(
      creditCardRepository,
      findWallet,
      findCategoryBySystemId,
      createSystemCategory,
    );
    const reopenInvoice = makeReopenInvoiceUseCase(creditCardRepository);

    app.withTypeProvider<ZodTypeProvider>().route({
      method: "GET",
      url: "/",
      preHandler: [verifyAuth],
      schema: {
        tags: ["Credit Cards"],
        response: {
          200: z.array(creditCardResponseSchema),
        },
      },
      handler: async (request, reply) => {
        const userId = request.userId;
        const creditCards = await getCreditCards(userId);
        return reply
          .status(200)
          .send(
            creditCards.map(({ creditCard, currentInvoiceAmount }) =>
              presentCreditCard(creditCard, currentInvoiceAmount),
            ),
          );
      },
    });

    app.withTypeProvider<ZodTypeProvider>().route({
      method: "POST",
      url: "/",
      preHandler: [verifyAuth],
      schema: {
        tags: ["Credit Cards"],
        body: createCreditCardSchema,
        response: {
          201: creditCardResponseSchema,
          403: appErrorResponseSchema,
          404: appErrorResponseSchema,
          409: appErrorResponseSchema,
        },
      },
      handler: async (request, reply) => {
        const userId = request.userId;
        const creditCard = await createCreditCard({ ...request.body, userId });
        return reply.status(201).send(presentCreditCard(creditCard, 0));
      },
    });

    app.withTypeProvider<ZodTypeProvider>().route({
      method: "PATCH",
      url: "/:id",
      preHandler: [verifyAuth],
      schema: {
        tags: ["Credit Cards"],
        params: z.object({ id: z.string() }),
        body: updateCreditCardSchema,
        response: {
          200: creditCardResponseSchema,
          403: appErrorResponseSchema,
          404: appErrorResponseSchema,
          409: appErrorResponseSchema,
        },
      },
      handler: async (request, reply) => {
        const userId = request.userId;
        const creditCard = await updateCreditCard({
          creditCardId: request.params.id,
          userId,
          data: request.body,
        });
        return reply.status(200).send(presentCreditCard(creditCard, 0));
      },
    });

    app.withTypeProvider<ZodTypeProvider>().route({
      method: "DELETE",
      url: "/:id",
      preHandler: [verifyAuth],
      schema: {
        tags: ["Credit Cards"],
        params: z.object({ id: z.string() }),
        response: {
          204: z.void(),
          403: appErrorResponseSchema,
          404: appErrorResponseSchema,
        },
      },
      handler: async (request, reply) => {
        await deleteCreditCard({ creditCardId: request.params.id, userId: request.userId });
        return reply.status(204).send();
      },
    });

    app.withTypeProvider<ZodTypeProvider>().route({
      method: "POST",
      url: "/:id/pay",
      preHandler: [verifyAuth],
      schema: {
        tags: ["Credit Cards"],
        params: z.object({ id: z.string() }),
        body: payInvoiceSchema,
        response: {
          204: z.void(),
          400: appErrorResponseSchema,
          403: appErrorResponseSchema,
          404: appErrorResponseSchema,
        },
      },
      handler: async (request, reply) => {
        await payInvoice({
          creditCardId: request.params.id,
          invoiceId: request.body.invoiceId,
          walletId: request.body.walletId,
          userId: request.userId,
          ...(request.body.transactionIds !== undefined
            ? { transactionIds: request.body.transactionIds }
            : {}),
          ...(request.body.amount !== undefined ? { amount: request.body.amount } : {}),
        });
        return reply.status(204).send();
      },
    });

    app.withTypeProvider<ZodTypeProvider>().route({
      method: "POST",
      url: "/invoices/:id/reopen",
      preHandler: [verifyAuth],
      schema: {
        tags: ["Credit Cards"],
        params: z.object({ id: z.string() }),
        response: {
          204: z.void(),
          400: appErrorResponseSchema,
          403: appErrorResponseSchema,
          404: appErrorResponseSchema,
        },
      },
      handler: async (request, reply) => {
        await reopenInvoice({ invoiceId: request.params.id, userId: request.userId });
        return reply.status(204).send();
      },
    });
  };
