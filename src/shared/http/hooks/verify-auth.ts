import type { FastifyReply, FastifyRequest } from "fastify";

export const verifyAuth = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const token = request.headers.authorization?.replace("Bearer ", "");

  if (!token) {
    return reply.status(401).send({ error: "Unauthorized" });
  }

  request.userId = "user-test-id";
};
