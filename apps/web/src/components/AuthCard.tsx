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
  onBackToLanding,
}: AuthCardProps) {
  const btnLabel = loading
    ? "Lädt…"
    : mode === "login" ? "Einloggen"
    : mode === "register" ? "Konto erstellen"
    : mode === "forgot" ? "Link senden"
    : "Absenden";

  return (
    <div style={s.root}>
      <div style={s.card}>
        {/* Brand */}
        <div style={s.brand}>
          <img src="/chat-net-logo.svg" alt="Chat-Net" style={s.logo} />
          <h1 style={s.appName}>Chat-Net</h1>
          <p style={s.tagline}>Chat für echte Gespräche.</p>
        </div>

        {resetTokenFromLink ? (
          /* ── Reset password (link flow) ── */
          <div style={s.form}>
            <p style={s.formTitle}>Neues Passwort vergeben</p>
            <Field label="Neues Passwort">
              <input style={s.input} type="password" autoComplete="new-password" placeholder="Mindestens 8 Zeichen" value={password} onChange={(e) => setPassword(e.target.value)} />
            </Field>
            <button style={s.btnPrimary} onClick={submit} disabled={loading}>{loading ? "Lädt…" : "Passwort speichern"}</button>
            <button style={s.btnSecondary} onClick={onBackToLoginFromReset}>Zurück zum Login</button>
          </div>
        ) : (
          /* ── Normal auth flow ── */
          <div style={s.form}>
            {/* Tabs */}
            <div style={s.tabs}>
              <button style={mode === "login" ? s.tabActive : s.tab} onClick={() => setMode("login")}>Login</button>
              <button style={mode === "register" ? s.tabActive : s.tab} onClick={() => setMode("register")}>Registrieren</button>
            </div>

            {/* Fields */}
            {(mode === "login" || mode === "register" || mode === "forgot") && (
              <Field label="E-Mail">
                <input style={s.input} type="email" placeholder="name@email.de" value={email} onChange={(e) => setEmail(e.target.value)} />
              </Field>
            )}
            {(mode === "login" || mode === "register") && (
              <Field label="Passwort">
                <input style={s.input} type="password" autoComplete={mode === "register" ? "new-password" : "current-password"} placeholder="Mindestens 8 Zeichen" value={password} onChange={(e) => setPassword(e.target.value)} />
              </Field>
            )}
            {mode === "register" && (
              <Field label="Anzeigename">
                <input style={s.input} type="text" placeholder="Dein Name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
              </Field>
            )}
            {mode === "reset" && (
              <Field label="Token">
                <input style={s.input} type="text" placeholder="Token" value={token} onChange={(e) => setToken(e.target.value)} />
              </Field>
            )}

            {/* Submit */}
            <button style={s.btnPrimary} onClick={submit} disabled={loading}>{btnLabel}</button>

            {/* Secondary links */}
            {mode === "login" && <button style={s.link} onClick={() => setMode("forgot")}>Passwort vergessen?</button>}
            {mode === "forgot" && <button style={s.link} onClick={() => setMode("login")}>Zurück zum Login</button>}

            {/* Divider */}
            <div style={s.divider}><span style={s.dividerText}>oder</span></div>

            {/* Google */}
            {googleClientId ? (
              <>
                <div ref={googleButtonRef} style={s.googleSlot} />
                {!googleReady && !googleLoadError && <p style={s.hint}>Google Login wird geladen…</p>}
                {!googleReady && googleLoadError && (
                  <div>
                    <p style={s.hint}>{googleLoadError}</p>
                    <button style={s.btnSecondary} onClick={onRetryGoogleRender}>Erneut versuchen</button>
                  </div>
                )}
              </>
            ) : (
              <p style={s.hint}>Google Login ist derzeit nicht verfügbar.</p>
            )}

            {/* Apple (coming soon) */}
            <button style={s.btnApple} disabled>
              <svg width="17" height="17" viewBox="0 0 18 18" fill="currentColor"><path d="M14.94 4.88a4.08 4.08 0 0 0-2.39 3.69 3.94 3.94 0 0 0 2.4 3.63 8.93 8.93 0 0 1-1.25 2.55c-.77 1.1-1.56 2.18-2.82 2.2-1.23.02-1.63-.73-3.04-.73s-1.85.71-3.01.75c-1.21.04-2.14-1.18-2.92-2.27C.32 12.54-.67 8.84.67 6.35A4.33 4.33 0 0 1 4.32 4.1c1.19-.02 2.31.8 3.04.8.72 0 2.08-.99 3.51-.85a4.28 4.28 0 0 1 3.35 1.71l.72 1.12ZM11.35.38A3.98 3.98 0 0 1 10.43 3a3.41 3.41 0 0 1-2.24 1.16A3.72 3.72 0 0 1 9.16.97 4 4 0 0 1 11.35.38Z" /></svg>
              Mit Apple anmelden
              <span style={s.soonBadge}>soon</span>
            </button>

            {/* Feedback */}
            {message && <p style={s.msgBanner}>{message}</p>}

            {/* Back to landing */}
            {onBackToLanding && (
              <button style={s.link} onClick={onBackToLanding}>← Zurück zur Startseite</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#64748b" }}>{label}</label>
      {children}
    </div>
  );
}

const C = { bg: "#060b14", surface: "#0d1117", elevated: "#111827", border: "rgba(255,255,255,0.08)", accent: "#5865f2", text: "#e2e8f0", muted: "#64748b" };

const s: Record<string, React.CSSProperties> = {
  root: { minHeight: "100dvh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "Inter, sans-serif" },
  card: { width: "100%", maxWidth: 420, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 18, overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.6)" },
  brand: { background: C.elevated, borderBottom: `1px solid ${C.border}`, padding: "32px 32px 24px", textAlign: "center" },
  logo: { width: 48, height: 48, marginBottom: 12 },
  appName: { fontSize: 24, fontWeight: 800, margin: "0 0 4px", color: C.text },
  tagline: { fontSize: 13, color: C.muted, margin: 0 },
  form: { padding: "28px 32px 32px", display: "flex", flexDirection: "column", gap: 16 },
  formTitle: { fontSize: 17, fontWeight: 700, color: C.text, margin: 0 },
  tabs: { display: "flex", gap: 4, background: C.elevated, borderRadius: 10, padding: 4 },
  tab: { flex: 1, padding: "8px", borderRadius: 7, border: "none", background: "transparent", color: C.muted, fontWeight: 600, fontSize: 13, cursor: "pointer" },
  tabActive: { flex: 1, padding: "8px", borderRadius: 7, border: "none", background: C.surface, color: C.text, fontWeight: 700, fontSize: 13, cursor: "pointer", boxShadow: "0 1px 4px rgba(0,0,0,0.3)" },
  input: { padding: "10px 14px", borderRadius: 8, border: `1px solid ${C.border}`, background: "#0f1923", color: C.text, fontSize: 14, fontFamily: "Inter, sans-serif", outline: "none" },
  btnPrimary: { padding: "12px", borderRadius: 9, border: "none", background: C.accent, color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", marginTop: 4 },
  btnSecondary: { padding: "11px", borderRadius: 9, border: `1px solid ${C.border}`, background: "transparent", color: C.text, fontWeight: 600, fontSize: 14, cursor: "pointer" },
  btnApple: { display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "11px", borderRadius: 9, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, fontWeight: 600, fontSize: 14, cursor: "not-allowed", opacity: 0.6, position: "relative" },
  soonBadge: { fontSize: 10, fontWeight: 700, background: "rgba(88,101,242,0.2)", color: C.accent, borderRadius: 20, padding: "1px 6px", marginLeft: 4 },
  link: { background: "transparent", border: "none", color: C.accent, fontSize: 13, cursor: "pointer", textAlign: "left", padding: 0 },
  divider: { display: "flex", alignItems: "center", gap: 12, margin: "4px 0" },
  dividerText: { fontSize: 12, color: C.muted, whiteSpace: "nowrap", padding: "0 4px" },
  googleSlot: { minHeight: 44, display: "flex", justifyContent: "center" },
  hint: { fontSize: 12, color: C.muted, margin: 0, textAlign: "center" },
  msgBanner: { fontSize: 13, color: C.text, background: "rgba(88,101,242,0.1)", border: "1px solid rgba(88,101,242,0.2)", borderRadius: 8, padding: "10px 14px", margin: 0, whiteSpace: "pre-wrap" },
};
