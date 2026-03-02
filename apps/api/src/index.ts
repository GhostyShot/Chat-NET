import { createServer } from "node:http";
import { createApp } from "./app.js";
import { appConfig } from "./config.js";
import { setupRealtime } from "./realtime.js";
import { prisma } from "./lib/prisma.js";

const app = createApp();
const server = createServer(app);
const realtime = setupRealtime(server);

let isShuttingDown = false;

async function shutdown(signal: string) {
  if (isShuttingDown) {
    return;
  }
  isShuttingDown = true;
  console.log(`[shutdown] received ${signal}`);

  await new Promise<void>((resolve) => {
    server.close(() => resolve());
  });

  await realtime.close();
  await prisma.$disconnect();
  console.log("[shutdown] completed");
}

process.on("SIGINT", () => {
  void shutdown("SIGINT").finally(() => process.exit(0));
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM").finally(() => process.exit(0));
});

process.on("uncaughtException", (error) => {
  console.error("[fatal] uncaughtException", error);
  void shutdown("uncaughtException").finally(() => process.exit(1));
});

process.on("unhandledRejection", (reason) => {
  console.error("[fatal] unhandledRejection", reason);
  void shutdown("unhandledRejection").finally(() => process.exit(1));
});

server.listen(appConfig.port, () => {
  console.log(`Chat-Net API läuft auf http://localhost:${appConfig.port}`);
});