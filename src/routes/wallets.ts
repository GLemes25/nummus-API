import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import z from "zod";
import { createWallet, getUserWallets } from "../usecases/wallet.js";

const walletSchema = z.object({
  id: z.string(),
  name: z.string(),
  balance: z.number(),
  userId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const walletRoutes = async (app: FastifyInstance) => {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: "POST",
    url: "/",
    schema: {
      tags: ["Wallets"],
      body: z.object({
        name: z.string().min(1),
        initialBalance: z.number().optional(),
      }),
      response: {
        201: walletSchema,
      },
    },
    handler: async (request, reply) => {
      const userId = "id-do-usuario-logado";
      const wallet = await createWallet({
        name: request.body.name,
        ...(request.body.initialBalance !== undefined ? { initialBalance: request.body.initialBalance } : {}),
        userId,
      });
      return reply.status(201).send(wallet);
    },
  });

  app.withTypeProvider<ZodTypeProvider>().route({
    method: "GET",
    url: "/",
    schema: {
      tags: ["Wallets"],
      response: {
        200: z.array(walletSchema),
      },
    },
    handler: async (request, reply) => {
      const userId = "id-do-usuario-logado";
      const wallets = await getUserWallets(userId);
      return reply.status(200).send(wallets);
    },
  });
};
