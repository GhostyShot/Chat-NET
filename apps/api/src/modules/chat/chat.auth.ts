import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { config } from "../../config.js";

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email?: string;
  };
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authorization = req.headers.authorization;
  if (!authorization?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "AUTH_REQUIRED" });
  }

  const token = authorization.slice("Bearer ".length);
  try {
    const payload = jwt.verify(token, config.jwtAccessSecret) as { sub?: string; email?: string };
    if (!payload.sub) {
      return res.status(401).json({ error: "INVALID_TOKEN" });
    }
    req.user = {
      userId: payload.sub,
      email: payload.email
    };
    return next();
  } catch {
    return res.status(401).json({ error: "INVALID_TOKEN" });
  }
}