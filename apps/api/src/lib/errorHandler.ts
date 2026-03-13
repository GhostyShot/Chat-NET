import type { Request, Response, NextFunction } from "express";

export interface AppError {
  statusCode: number;
  code: string;
  message: string;
}

/**
 * Central error handler middleware.
 * Catches all errors thrown in route handlers and returns
 * a consistent JSON error shape: { code, message }.
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Known application errors
  if (isAppError(err)) {
    res.status(err.statusCode).json({ code: err.code, message: err.message });
    return;
  }

  // Express body-parser errors (e.g. JSON syntax)
  if (err instanceof SyntaxError && "status" in err && (err as { status?: number }).status === 400) {
    res.status(400).json({ code: "INVALID_JSON", message: "Ungltiges JSON-Format." });
    return;
  }

  // Generic Error objects
  if (err instanceof Error) {
    const code = err.message.toUpperCase().replace(/\s+/g, "_");
    // Don't leak internals on known error codes
    const isKnownCode = /^[A-Z][A-Z0-9_]{2,64}$/.test(code);
    if (isKnownCode) {
      res.status(400).json({ code, message: err.message });
      return;
    }
    // Log unexpected errors but return a safe message
    console.error("[unhandled error]", err);
    res.status(500).json({ code: "INTERNAL_ERROR", message: "Ein interner Fehler ist aufgetreten." });
    return;
  }

  // Fallback
  console.error("[unknown error]", err);
  res.status(500).json({ code: "INTERNAL_ERROR", message: "Ein interner Fehler ist aufgetreten." });
}

function isAppError(err: unknown): err is AppError {
  return (
    typeof err === "object" &&
    err !== null &&
    "statusCode" in err &&
    "code" in err &&
    typeof (err as AppError).statusCode === "number"
  );
}
