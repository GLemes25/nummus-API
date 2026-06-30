import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { ZodTypeProvider } from "fastify-type-provider-zod";

import { verifyAuth } from "../../../shared/http/hooks/verify-auth.js";
import { createWalletSchema, getWalletsSchema, walletResponseSchema } from "../dtos/create-wallet.dto.js";
import { walletRepository } from "../repositories/wallet.repository.js";
import { makeCreateWalletUseCase } from "../use-cases/create-wallet.use-case.js";
import { makeGetWalletsUseCase } from "../use-cases/get-wallets.use-case.js";
import { presentWallet } from "./presenters/wallet.presenter.js";

export const walletRoutes = async (app: FastifyInstance) => {
  const createWallet = makeCreateWalletUseCase(walletRepository);
  const getWallets = makeGetWalletsUseCase(walletRepository);

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
};
