import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import z from "zod";
import { createTransaction } from "../usecases/createTransaction.js";

export const transactionRoutes = async (app: FastifyInstance) => {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: "POST",
    url: "/",
    schema: {
      tags: ["Transactions"],
      body: z.object({
        walletId: z.uuid(),
        categoryId: z.uuid(),
        amount: z.number().positive(),
        type: z.enum(["INCOME", "EXPENSE", "BALANCE_ADJUSTMENT"]),
        date: z.string().datetime(),
        description: z.string(),
      }),
    },
    handler: async (request, reply) => {
      // Aqui entraria a verificação do Better Auth para pegar o userId
      const userId = "id-do-usuario-logado";

      const result = await createTransaction({
        ...request.body,
        date: new Date(request.body.date),
        userId,
      });

      return reply.status(201).send(result);
    },
  });
};
