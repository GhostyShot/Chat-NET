import express from "express";
import cors from "cors";
import helmet from "helmet";
import path from "node:path";
import { authRouter } from "./modules/auth/auth.routes.js";
import { chatRouter } from "./modules/chat/chat.routes.js";
import { config } from "./config.js";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: config.webOrigin,
      credentials: true
    })
  );
  app.use(express.json({ limit: "2mb" }));
  app.use("/uploads", express.static(path.resolve(process.cwd(), "apps/api/uploads")));

  app.get("/health", (_req, res) => {
    res.json({ ok: true, service: "chat-net-api" });
  });

  app.use("/auth", authRouter);
  app.use("/chat", chatRouter);

  return app;
}