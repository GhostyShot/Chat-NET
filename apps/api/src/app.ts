import express from "express";
import cors from "cors";
import helmet from "helmet";
import { authRouter } from "./modules/auth/auth.routes.js";
import { chatRouter } from "./modules/chat/chat.routes.js";
import { brawlStarsRouter } from "./modules/brawlstars/brawlstars.routes.js";
import { appConfig } from "./config.js";
import { prisma } from "./lib/prisma.js";
import { apiLimiter } from "./lib/rateLimiter.js";
import { errorHandler } from "./lib/errorHandler.js";

export function createApp() {
  const app = express();
  app.set("trust proxy", 1);

  // Security headers
  app.use(helmet());

  // CORS
  app.use(
    cors({
      origin: appConfig.webOrigins,
      credentials: true,
    })
  );

  // Body parsing
  app.use(express.json({ limit: "2mb" }));

  // Static uploads
  app.use("/uploads", express.static(appConfig.uploadDir));

  // Health checks (no rate limit — used by uptime monitors)
  app.get("/health", (_req, res) => {
    res.json({ ok: true, service: "chat-net-api" });
  });

  app.get("/ready", async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ ok: true, service: "chat-net-api", database: "up" });
    } catch {
      res.status(503).json({ ok: false, service: "chat-net-api", database: "down" });
    }
  });

  // Rate-limited routes
  app.use("/auth", authRouter);
  app.use("/chat", apiLimiter, chatRouter);
  app.use("/brawlstars", brawlStarsRouter);

  // Central error handler (must be last)
  app.use(errorHandler);

  return app;
}
