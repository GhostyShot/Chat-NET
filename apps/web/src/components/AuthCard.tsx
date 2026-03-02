import type { Dispatch, MutableRefObject, SetStateAction } from "react";

type Mode = "login" | "register" | "forgot" | "reset";

type AuthCardProps = {
  resetTokenFromLink: string | null;
  mode: Mode;
  setMode: Dispatch<SetStateAction<Mode>>;
  email: string;
  setEmail: Dispatch<SetStateAction<string>>;
  password: string;
  setPassword: Dispatch<SetStateAction<string>>;
  displayName: string;
  setDisplayName: Dispatch<SetStateAction<string>>;
  token: string;
  setToken: Dispatch<SetStateAction<string>>;
  submit: () => void;
  loading: boolean;
  message: string;
  googleClientId?: string;
  googleButtonRef: MutableRefObject<HTMLDivElement | null>;
  googleReady: boolean;
  googleLoadError: string;
  onRetryGoogleRender: () => void;
  onBackToLoginFromReset: () => void;
  onBackToLanding?: () => void;
};

export function AuthCard({
  resetTokenFromLink,
  mode,
  setMode,
  email,
  setEmail,
  password,
  setPassword,
  displayName,
  setDisplayName,
  token,
  setToken,
  submit,
  loading,
  message,
  googleClientId,
  googleButtonRef,
  googleReady,
  googleLoadError,
  onRetryGoogleRender,
  onBackToLoginFromReset,
  onBackToLanding
}: AuthCardProps) {
  const buttonLabel = () => {
    if (loading) return "L\u00E4dt\u2026";
    if (mode === "login") return "Einloggen";
    if (mode === "register") return "Konto erstellen";
    if (mode === "forgot") return "Link senden";
    return "Absenden";
  };

  return (
    <main className="app-shell auth-shell">
      <section className={resetTokenFromLink ? "auth-card reset-card" : "auth-card"}>
        <div className="auth-brand">
          <img src="/chat-net-logo.svg" alt="Chat-Net Logo" className="auth-logo" />
          <h1>Chat-Net</h1>
          <p className="subtitle">Chat f{"\u00FC"}r echte Gespr{"\u00E4"}che.</p>
        </div>

        <div className="auth-panel">
          {resetTokenFromLink ? (
            <>
              <h3>Neues Passwort vergeben</h3>
              <p className="hint">Lege jetzt dein neues Passwort fest.</p>
              <label>
                Neues Passwort
                <input
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  type="password"
                  autoComplete="new-password"
                  placeholder="Mindestens 8 Zeichen"
                />
              </label>
              <button onClick={submit} disabled={loading} className="primary wide">
                {loading ? "L\u00E4dt\u2026" : "Passwort speichern"}
              </button>
              <button className="secondary wide" onClick={onBackToLoginFromReset}>
                {"Zur\u00FCck zum Login"}
              </button>
              {message && <p className="message-banner">{message}</p>}
            </>
          ) : (
            <>
              <div className="mode-tabs">
                <button className={mode === "login" ? "tab active" : "tab"} onClick={() => setMode("login")}>
                  Login
                </button>
                <button className={mode === "register" ? "tab active" : "tab"} onClick={() => setMode("register")}>
                  Registrieren
                </button>
              </div>

              {(mode === "login" || mode === "register" || mode === "forgot") && (
                <label>
                  E-Mail
                  <input
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    type="email"
                    placeholder="name@email.de"
                  />
                </label>
              )}

              {(mode === "login" || mode === "register") && (
                <label>
                  Passwort
                  <input
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    type="password"
                    autoComplete={mode === "register" ? "new-password" : "current-password"}
                    placeholder="Mindestens 8 Zeichen"
                  />
                </label>
              )}

              {mode === "register" && (
                <label>
                  Anzeigename
                  <input
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    type="text"
                    placeholder="Dein Name"
                  />
                </label>
              )}

              {mode === "reset" && (
                <label>
                  Token
                  <input value={token} onChange={(event) => setToken(event.target.value)} type="text" placeholder="Token" />
                </label>
              )}

              <button onClick={submit} disabled={loading} className="primary wide">
                {buttonLabel()}
              </button>

              {mode === "login" && (
                <div className="auth-back-link">
                  <button onClick={() => setMode("forgot")}>Passwort vergessen?</button>
                </div>
              )}

              {mode === "forgot" && (
                <div className="auth-back-link">
                  <button onClick={() => setMode("login")}>{"Zur\u00FCck zum Login"}</button>
                </div>
              )}

              <div className="auth-divider">
                <span>oder</span>
              </div>

              {googleClientId ? (
                <>
                  <div ref={googleButtonRef} className="google-button-slot" />
                  {!googleReady && !googleLoadError && <p className="hint">Google Login wird geladen...</p>}
                  {!googleReady && googleLoadError && (
                    <div className="google-fallback">
                      <p className="hint">{googleLoadError}</p>
                      <button className="secondary compact" onClick={onRetryGoogleRender}>
                        Erneut versuchen
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <p className="hint">
                  {"Google Login ist derzeit nicht verf\u00FCgbar."}
                </p>
              )}

              <div className="apple-signin-wrapper">
                <button className="apple-signin-btn" disabled>
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
                    <path d="M14.94 4.88a4.08 4.08 0 0 0-2.39 3.69 3.94 3.94 0 0 0 2.4 3.63 8.93 8.93 0 0 1-1.25 2.55c-.77 1.1-1.56 2.18-2.82 2.2-1.23.02-1.63-.73-3.04-.73s-1.85.71-3.01.75c-1.21.04-2.14-1.18-2.92-2.27C.32 12.54-.67 8.84.67 6.35A4.33 4.33 0 0 1 4.32 4.1c1.19-.02 2.31.8 3.04.8.72 0 2.08-.99 3.51-.85a4.28 4.28 0 0 1 3.35 1.71l.72 1.12ZM11.35.38A3.98 3.98 0 0 1 10.43 3a3.41 3.41 0 0 1-2.24 1.16A3.72 3.72 0 0 1 9.16.97 4 4 0 0 1 11.35.38Z" />
                  </svg>
                  Mit Apple anmelden
                </button>
                <span className="apple-soon-badge">soon</span>
              </div>

              {message && <p className="message-banner">{message}</p>}

              {onBackToLanding && (
                <div className="auth-back-link">
                  <button onClick={onBackToLanding}>{"Zur\u00FCck zur Startseite"}</button>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </main>
  );
}
