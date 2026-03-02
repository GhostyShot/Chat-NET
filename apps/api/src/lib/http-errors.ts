import type { ApiErrorCode, ApiErrorPayload } from "@chatnet/shared";
import { API_ERROR_CODES } from "@chatnet/shared";
import type { Response } from "express";

type ErrorMatcher = {
  badRequest?: readonly ApiErrorCode[];
  forbidden?: readonly ApiErrorCode[];
  unauthorized?: readonly ApiErrorCode[];
  customStatus?: (code: string) => number | undefined;
  defaultStatus?: number;
};

function getErrorCode(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return API_ERROR_CODES.UNEXPECTED_ERROR;
}

function resolveStatus(code: string, matcher: ErrorMatcher): number {
  if (matcher.customStatus) {
    const custom = matcher.customStatus(code);
    if (typeof custom === "number") {
      return custom;
    }
  }

  if (matcher.unauthorized?.includes(code as ApiErrorCode)) {
    return 401;
  }

  if (matcher.badRequest?.includes(code as ApiErrorCode)) {
    return 400;
  }

  if (matcher.forbidden?.includes(code as ApiErrorCode)) {
    return 403;
  }

  return matcher.defaultStatus ?? 500;
}

export function sendError(res: Response, error: unknown, matcher: ErrorMatcher = {}): Response {
  const code = getErrorCode(error);
  const payload: ApiErrorPayload = {
    error: code
  };
  return res.status(resolveStatus(code, matcher)).json(payload);
}

export function withErrorBoundary<T>(fn: () => Promise<T>, res: Response, matcher: ErrorMatcher = {}) {
  fn()
    .then((data) => res.json(data))
    .catch((error) => {
      sendError(res, error, matcher);
    });
}
