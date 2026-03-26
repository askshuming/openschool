import { createApp } from "./create-app.mjs";

const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;
const HOST = process.env.HOST ?? "127.0.0.1";

const app = createApp();

try {
  await app.listen({
    host: HOST,
    port: PORT,
  });
  app.log.info(`Fastify server listening on http://${HOST}:${PORT}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
