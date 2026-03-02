import { useEffect, useState } from "react";
import type { AuthResponse } from "@chatnet/shared";

const AUTH_COOKIE_KEY = "chat_net_auth";
const AUTH_STORAGE_KEY = "chat_net_auth_v1";
const AUTH_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 14;

function readPersistedAuth(): AuthResponse | null {
  if (typeof window === "undefined") {
    return null;
  }

  const tryParse = (raw: string | null): AuthResponse | null => {
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as AuthResponse;
    } catch {
      return null;
    }
  };

  const cookieMatch = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${AUTH_COOKIE_KEY}=`));
  const fromCookie = tryParse(cookieMatch ? decodeURIComponent(cookieMatch.split("=").slice(1).join("=")) : null);
  if (fromCookie) {
    return fromCookie;
  }

  return tryParse(window.localStorage.getItem(AUTH_STORAGE_KEY));
}

function persistAuth(auth: AuthResponse | null) {
  if (typeof window === "undefined") {
    return;
  }

  if (!auth) {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    document.cookie = `${AUTH_COOKIE_KEY}=; Max-Age=0; Path=/; SameSite=Lax`;
    return;
  }

  const payload = JSON.stringify(auth);
  window.localStorage.setItem(AUTH_STORAGE_KEY, payload);
  document.cookie = `${AUTH_COOKIE_KEY}=${encodeURIComponent(payload)}; Max-Age=${AUTH_COOKIE_MAX_AGE_SECONDS}; Path=/; SameSite=Lax`;
}

export function usePersistentAuth() {
  const [auth, setAuth] = useState<AuthResponse | null>(() => readPersistedAuth());

  useEffect(() => {
    persistAuth(auth);
  }, [auth]);

  return [auth, setAuth] as const;
}
