import { prisma } from "./lib/prisma.js";
import { createApp } from "./app.js";
import { env } from "./config/env.js";

const app = createApp();

export async function startServer() {
  await prisma.$connect();

  app.listen(env.port, () => {
    console.log(`Server is running on http://localhost:${env.port}`);
  });
}

export async function shutdown(signal: string) {
  console.log(`${signal} received. Shutting down...`);
  await prisma.$disconnect();
  process.exit(0);
}
