export interface ApiRequestErrorOptions {
  status?: number;
  code?: string;
  isNetwork?: boolean;
  isTimeout?: boolean;
}

export class ApiRequestError extends Error {
  status: number;
  code?: string;
  isNetwork: boolean;
  isTimeout: boolean;

  constructor(message: string, options: ApiRequestErrorOptions = {}) {
    super(message);
    this.name = "ApiRequestError";
    this.status = options.status ?? 0;
    this.code = options.code;
    this.isNetwork = Boolean(options.isNetwork);
    this.isTimeout = Boolean(options.isTimeout);
  }
}

export interface RequestJsonOptions {
  fallbackError: string;
  timeoutMs?: number;
  retry?: boolean;
  timeoutMessage?: string;
  networkMessage?: string;
  requestCode?: string;
}

type ErrorCandidate = {
  error?: unknown;
  message?: unknown;
  code?: unknown;
  errorCode?: unknown;
};

const DEFAULT_TIMEOUT_MS = 12_000;
const DEFAULT_TIMEOUT_MESSAGE = "Request timed out. Please try again.";
const DEFAULT_NETWORK_MESSAGE = "Network error. Please check your connection.";

function extractErrorMessage(payload: unknown, fallbackError: string): string {
  if (!payload || typeof payload !== "object") {
    return fallbackError;
  }

  const candidate = payload as ErrorCandidate;
  if (typeof candidate.error === "string" && candidate.error.trim()) {
    return candidate.error;
  }

  if (typeof candidate.message === "string" && candidate.message.trim()) {
    return candidate.message;
  }

  return fallbackError;
}

function extractErrorCode(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object") {
    return undefined;
  }

  const candidate = payload as ErrorCandidate;
  if (typeof candidate.code === "string" && candidate.code.trim()) {
    return candidate.code;
  }

  if (typeof candidate.errorCode === "string" && candidate.errorCode.trim()) {
    return candidate.errorCode;
  }

  return undefined;
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

async function parseResponsePayload(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }

  try {
    const text = await response.text();
    return text ? { error: text } : null;
  } catch {
    return null;
  }
}

export async function requestJson<T>(baseUrl: string, path: string, init: RequestInit, options: RequestJsonOptions): Promise<T> {
  const method = (init.method ?? "GET").toUpperCase();
  const shouldRetry = options.retry ?? method === "GET";
  const maxAttempts = shouldRetry ? 2 : 1;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);

    try {
      const response = await fetch(`${baseUrl}${path}`, {
        ...init,
        signal: controller.signal
      });

      const payload = await parseResponsePayload(response);
      if (!response.ok) {
        throw new ApiRequestError(extractErrorMessage(payload, options.fallbackError), {
          status: response.status,
          code: extractErrorCode(payload)
        });
      }

      return payload as T;
    } catch (error) {
      const timedOut = isAbortError(error);
      const networkIssue = timedOut || error instanceof TypeError;
      const canRetry = attempt < maxAttempts - 1 && networkIssue;

      if (canRetry) {
        continue;
      }

      if (error instanceof ApiRequestError) {
        throw error;
      }

      if (timedOut) {
        throw new ApiRequestError(options.timeoutMessage ?? DEFAULT_TIMEOUT_MESSAGE, {
          isNetwork: true,
          isTimeout: true,
          code: options.requestCode ?? options.fallbackError
        });
      }

      if (error instanceof TypeError) {
        throw new ApiRequestError(options.networkMessage ?? DEFAULT_NETWORK_MESSAGE, {
          isNetwork: true,
          code: options.requestCode ?? options.fallbackError
        });
      }

      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  throw new ApiRequestError(options.fallbackError, {
    code: options.requestCode ?? options.fallbackError
  });
}
