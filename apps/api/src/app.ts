import express from "express";
import cors from "cors";
import helmet from "helmet";
import { authRouter } from "./modules/auth/auth.routes.js";
import { chatRouter } from "./modules/chat/chat.routes.js";
import { appConfig } from "./config.js";

export function createApp() {
  const app = express();
  app.set("trust proxy", 1);

  app.use(helmet());
  app.use(
    cors({
      origin: appConfig.webOrigin,
      credentials: true
    })
  );
  app.use(express.json({ limit: "2mb" }));
  app.use("/uploads", express.static(appConfig.uploadDir));

  app.get("/health", (_req, res) => {
    res.json({ ok: true, service: "chat-net-api" });
  });

  app.use("/auth", authRouter);
  app.use("/chat", chatRouter);

  return app;
}