import { useCallback, useEffect, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import type { AuthResponse } from "@chatnet/shared";
import { forgotPassword, login, loginWithGoogle, register, resetPassword } from "../lib/api";

type Mode = "login" | "register" | "forgot" | "reset";

type GoogleCredentialResponse = {
  credential?: string;
};

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: {
            client_id: string;
            callback: (response: GoogleCredentialResponse) => void;
          }) => void;
          renderButton: (
            element: HTMLElement,
            options: {
              type?: "standard";
              theme?: "outline" | "filled_black" | "filled_blue";
              size?: "large" | "medium" | "small";
              text?: "signin_with" | "continue_with" | "signup_with";
              shape?: "pill" | "rectangular";
              width?: number;
            }
          ) => void;
          prompt: () => void;
        };
      };
    };
  }
}

const GOOGLE_SCRIPT_ID = "google-identity-services";
export const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

type UseAuthFlowParams = {
  auth: AuthResponse | null;
  theme: "dark" | "light";
  mode: Mode;
  email: string;
  password: string;
  displayName: string;
  token: string;
  resetTokenFromLink: string | null;
  showAuthPage: boolean;
  googleRenderAttempt: number;
  googleButtonRef: MutableRefObject<HTMLDivElement | null>;
  setAuth: Dispatch<SetStateAction<AuthResponse | null>>;
  setLoading: Dispatch<SetStateAction<boolean>>;
  setMessage: Dispatch<SetStateAction<string>>;
  setMode: Dispatch<SetStateAction<Mode>>;
  setToken: Dispatch<SetStateAction<string>>;
  setPassword: Dispatch<SetStateAction<string>>;
  setResetTokenFromLink: Dispatch<SetStateAction<string | null>>;
  setShowAuthPage: Dispatch<SetStateAction<boolean>>;
  setGoogleReady: Dispatch<SetStateAction<boolean>>;
  setGoogleLoadError: Dispatch<SetStateAction<string>>;
};

export function useAuthFlow({
  auth,
  theme,
  mode,
  email,
  password,
  displayName,
  token,
  resetTokenFromLink,
  showAuthPage,
  googleRenderAttempt,
  googleButtonRef,
  setAuth,
  setLoading,
  setMessage,
  setMode,
  setToken,
  setPassword,
  setResetTokenFromLink,
  setShowAuthPage,
  setGoogleReady,
  setGoogleLoadError
}: UseAuthFlowParams) {
  useEffect(() => {
    if (typeof window === "undefined" || auth) {
      return;
    }
    const params = new URLSearchParams(window.location.search);
    const modeParam = params.get("mode");
    const resetToken = params.get("token");
    if (modeParam === "reset" && resetToken) {
      setMode("reset");
      setToken(resetToken);
      setResetTokenFromLink(resetToken);
      setShowAuthPage(true);
    }
  }, [auth, setMode, setResetTokenFromLink, setShowAuthPage, setToken]);

  useEffect(() => {
    if (auth || !showAuthPage || !!resetTokenFromLink || !googleClientId || !googleButtonRef.current) {
      setGoogleReady(false);
      setGoogleLoadError("");
      return;
    }

    let cancelled = false;
    let timeoutId: number | undefined;

    const setGoogleUnavailable = () => {
      if (cancelled) {
        return;
      }
      setGoogleReady(false);
      setGoogleLoadError("Google Login ist aktuell nicht verfügbar. Nutze bitte E-Mail Login.");
    };

    const renderGoogleButton = () => {
      if (cancelled || !window.google?.accounts?.id || !googleButtonRef.current) {
        return;
      }

      try {
        if (timeoutId) {
          window.clearTimeout(timeoutId);
        }

        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: async (response: GoogleCredentialResponse) => {
            if (!response.credential) {
              setMessage("Google Login konnte kein Token liefern.");
              return;
            }

            setLoading(true);
            setMessage("");
            try {
              setAuth(await loginWithGoogle(response.credential));
            } catch (error) {
              setMessage(error instanceof Error ? error.message : "Google Login fehlgeschlagen");
            } finally {
              setLoading(false);
            }
          }
        });

        googleButtonRef.current.innerHTML = "";
        window.google.accounts.id.renderButton(googleButtonRef.current, {
          theme: theme === "dark" ? "filled_black" : "outline",
          size: "large",
          text: "continue_with",
          shape: "pill",
          width: 320
        });
        window.google.accounts.id.prompt();
        setGoogleLoadError("");
        setGoogleReady(true);
      } catch {
        setGoogleUnavailable();
      }
    };

    timeoutId = window.setTimeout(() => {
      if (!window.google?.accounts?.id) {
        setGoogleUnavailable();
      }
    }, 7000);

    if (window.google?.accounts?.id) {
      renderGoogleButton();
      return () => {
        cancelled = true;
        if (timeoutId) {
          window.clearTimeout(timeoutId);
        }
      };
    }

    const existingScript = document.getElementById(GOOGLE_SCRIPT_ID) as HTMLScriptElement | null;
    if (existingScript) {
      existingScript.addEventListener("load", renderGoogleButton);
      existingScript.addEventListener("error", setGoogleUnavailable);
      return () => {
        cancelled = true;
        existingScript.removeEventListener("load", renderGoogleButton);
        existingScript.removeEventListener("error", setGoogleUnavailable);
        if (timeoutId) {
          window.clearTimeout(timeoutId);
        }
      };
    }

    const script = document.createElement("script");
    script.id = GOOGLE_SCRIPT_ID;
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.addEventListener("load", renderGoogleButton);
    script.addEventListener("error", setGoogleUnavailable);
    document.head.appendChild(script);

    return () => {
      cancelled = true;
      script.removeEventListener("load", renderGoogleButton);
      script.removeEventListener("error", setGoogleUnavailable);
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [
    auth,
    theme,
    showAuthPage,
    resetTokenFromLink,
    googleRenderAttempt,
    googleButtonRef,
    setAuth,
    setGoogleLoadError,
    setGoogleReady,
    setLoading,
    setMessage
  ]);

  const submit = useCallback(async () => {
    setLoading(true);
    setMessage("");
    try {
      if (mode === "login") {
        setAuth(await login(email, password));
      }
      if (mode === "register") {
        setAuth(await register(email, password, displayName));
      }
      if (mode === "forgot") {
        await forgotPassword(email);
        setMessage("Wenn ein Konto existiert, wurde eine E-Mail mit Reset-Link verschickt.");
      }
      if (mode === "reset") {
        await resetPassword(token, password);
        setMessage("Passwort wurde aktualisiert.");
        if (resetTokenFromLink) {
          setResetTokenFromLink(null);
          window.history.replaceState({}, "", "/");
          setMode("login");
          setToken("");
          setPassword("");
        }
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unbekannter Fehler");
    } finally {
      setLoading(false);
    }
  }, [
    mode,
    email,
    password,
    displayName,
    token,
    resetTokenFromLink,
    setAuth,
    setLoading,
    setMessage,
    setMode,
    setPassword,
    setResetTokenFromLink,
    setToken
  ]);

  return { submit };
}
