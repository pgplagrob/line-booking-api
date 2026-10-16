import { shutdown, startServer } from "./server.js";

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

startServer().catch(async (error) => {
  console.error("Cannot start server:", error);
  await import("./lib/prisma.js").then(({ prisma }) => prisma.$disconnect());
  process.exit(1);
});
