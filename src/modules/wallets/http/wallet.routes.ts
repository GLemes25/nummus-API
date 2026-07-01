import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { ZodTypeProvider } from "fastify-type-provider-zod";

import { verifyAuth } from "../../../shared/http/hooks/verify-auth.js";
import { appErrorResponseSchema } from "../../../shared/errors/make-app-error.js";
import { createWalletSchema, getWalletsSchema, walletResponseSchema } from "../dtos/create-wallet.dto.js";
import { updateWalletSchema } from "../dtos/update-wallet.dto.js";
import { walletRepository } from "../repositories/wallet.repository.js";
import { makeCreateWalletUseCase } from "../use-cases/create-wallet.use-case.js";
import { makeGetWalletsUseCase } from "../use-cases/get-wallets.use-case.js";
import { makeUpdateWalletUseCase } from "../use-cases/update-wallet.use-case.js";
import { presentWallet } from "./presenters/wallet.presenter.js";

export const walletRoutes = async (app: FastifyInstance) => {
  const createWallet = makeCreateWalletUseCase(walletRepository);
  const getWallets = makeGetWalletsUseCase(walletRepository);
  const updateWallet = makeUpdateWalletUseCase(walletRepository);

  app.withTypeProvider<ZodTypeProvider>().route({
    method: "GET",
    url: "/",
    preHandler: [verifyAuth],
    schema: {
      tags: ["Wallets"],
      querystring: getWalletsSchema,
      response: {
        200: z.array(walletResponseSchema),
      },
    },
    handler: async (request, reply) => {
      const userId = request.userId;
      const { isArchived } = request.query;
      const wallets = await getWallets({
        userId,
        ...(isArchived !== undefined ? { isArchived } : {}),
      });
      return reply.status(200).send(wallets.map(presentWallet));
    },
  });

  app.withTypeProvider<ZodTypeProvider>().route({
    method: "POST",
    url: "/",
    preHandler: [verifyAuth],
    schema: {
      tags: ["Wallets"],
      body: createWalletSchema,
      response: {
        201: walletResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const userId = request.userId;
      const wallet = await createWallet({ ...request.body, userId });
      return reply.status(201).send(presentWallet(wallet));
    },
  });

  app.withTypeProvider<ZodTypeProvider>().route({
    method: "PATCH",
    url: "/:id",
    preHandler: [verifyAuth],
    schema: {
      tags: ["Wallets"],
      params: z.object({ id: z.string() }),
      body: updateWalletSchema,
      response: {
        200: walletResponseSchema,
        403: appErrorResponseSchema,
        404: appErrorResponseSchema,
        409: appErrorResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const userId = request.userId;
      const wallet = await updateWallet({
        walletId: request.params.id,
        userId,
        data: request.body,
      });
      return reply.status(200).send(presentWallet(wallet));
    },
  });
};
