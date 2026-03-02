import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { API_ERROR_CODES } from "@chatnet/shared";
import { appConfig } from "../../config.js";

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email?: string;
  };
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authorization = req.headers.authorization;
  if (!authorization?.startsWith("Bearer ")) {
    return res.status(401).json({ error: API_ERROR_CODES.AUTH_REQUIRED });
  }

  const token = authorization.slice("Bearer ".length);
  try {
    const payload = jwt.verify(token, appConfig.jwtAccessSecret) as { sub?: string; email?: string };
    if (!payload.sub) {
      return res.status(401).json({ error: API_ERROR_CODES.INVALID_TOKEN });
    }
    req.user = {
      userId: payload.sub,
      email: payload.email
    };
    return next();
  } catch {
    return res.status(401).json({ error: API_ERROR_CODES.INVALID_TOKEN });
  }
}