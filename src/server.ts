import "dotenv/config";

import { env } from "./lib/env.js";
import { buildApp } from "./shared/http/server.js";

const app = await buildApp();

try {
  await app.listen({ port: Number(env.PORT), host: "0.0.0.0" });
  app.log.info(`Server running at ${env.API_BASE_URL}`);
  app.log.info(`API Docs available at ${env.API_BASE_URL}/documentation`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
