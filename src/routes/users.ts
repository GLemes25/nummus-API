import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import z from "zod";

import { auth } from "../lib/auth.js";

export const userRoutes: FastifyPluginAsyncZod = async (app) => {
  app.route({
    method: "GET",
    url: "/me",
    schema: {
      description: "Retorna os dados do usuário autenticado",
      tags: ["Users"],
      response: {
        200: z.object({
          id: z.string(),
          name: z.string(),
          email: z.string().email(),
          image: z.string().nullable(),
          createdAt: z.coerce.date(),
          updatedAt: z.coerce.date(),
        }),
        401: z.object({ error: z.string() }),
      },
    },
    async handler(request, reply) {
      const session = await auth.api.getSession({
        headers: new Headers(
          Object.entries(request.headers).flatMap(([key, value]) =>
            value ? [[key, value.toString()]] : []
          )
        ),
      });

      if (!session) {
        return reply.status(401).send({ error: "Não autenticado" });
      }

      const { image, ...rest } = session.user;
      return reply.send({ ...rest, image: image ?? null });
    },
  });
};
