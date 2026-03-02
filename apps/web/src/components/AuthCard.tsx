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
  onBackToLoginFromReset
}: AuthCardProps) {
  return (
    <main className="app-shell auth-shell">
      <section className={resetTokenFromLink ? "auth-card reset-card" : "auth-card"}>
        <div className="auth-brand">
          <img src="/chat-net-logo.svg" alt="Chat-Net Logo" className="auth-logo" />
          <p className="eyebrow">chat-net.tech</p>
          <h1>Chat-Net</h1>
          <p className="subtitle">
            Der sichere Chat f{"\u00FC"}r echte Gespr{"\u00E4"}che. Schnell, modern und Community-ready.
          </p>
          <div className="auth-brand-badges" aria-hidden="true">
            <span className="auth-brand-pill">Realtime</span>
            <span className="auth-brand-pill">Sicher</span>
            <span className="auth-brand-pill">Community</span>
          </div>
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
                {loading ? "L\u00E4dt..." : "Passwort speichern"}
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
                <button className={mode === "forgot" ? "tab active" : "tab"} onClick={() => setMode("forgot")}>
                  Passwort vergessen
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
                    autoComplete="current-password"
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
                {loading ? "L\u00E4dt..." : "Absenden"}
              </button>

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
                  {"Setze in Vercel zus\u00E4tzlich `VITE_GOOGLE_CLIENT_ID`, um Google Login zu aktivieren."}
                </p>
              )}

              {message && <p className="message-banner">{message}</p>}
            </>
          )}
        </div>
      </section>
    </main>
  );
}
