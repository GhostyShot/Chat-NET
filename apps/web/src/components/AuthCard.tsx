import type { Dispatch, MutableRefObject, SetStateAction } from 'react';

type Mode = 'login' | 'register' | 'forgot' | 'reset';

type AuthCardProps = {
  resetTokenFromLink: string | null;
  mode: Mode;
  setMode: Dispatch<SetStateAction<Mode>>;
  email: string; setEmail: Dispatch<SetStateAction<string>>;
  password: string; setPassword: Dispatch<SetStateAction<string>>;
  displayName: string; setDisplayName: Dispatch<SetStateAction<string>>;
  token: string; setToken: Dispatch<SetStateAction<string>>;
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
  resetTokenFromLink, mode, setMode,
  email, setEmail, password, setPassword,
  displayName, setDisplayName,
  token, setToken,
  submit, loading, message,
  googleClientId, googleButtonRef, googleReady, googleLoadError,
  onRetryGoogleRender, onBackToLoginFromReset, onBackToLanding,
}: AuthCardProps) {
  const label = loading ? 'Lädt…'
    : mode === 'login' ? 'Einloggen'
    : mode === 'register' ? 'Konto erstellen'
    : mode === 'forgot' ? 'Link senden'
    : 'Absenden';

  return (
    <div style={s.root}>
      <div style={s.card}>
        <div style={s.brand}>
          <img src="/chat-net-logo.svg" alt="" style={s.logo} />
          <div style={s.brandName}>Chat-Net</div>
          <div style={s.brandTag}>Chat für echte Gespräche.</div>
        </div>

        {resetTokenFromLink ? (
          <div style={s.form}>
            <div style={s.formTitle}>Neues Passwort</div>
            <Field label="Neues Passwort">
              <input style={s.input} type="password" autoComplete="new-password" placeholder="Min. 8 Zeichen" value={password} onChange={e => setPassword(e.target.value)} />
            </Field>
            <button style={s.btnPrimary} onClick={submit} disabled={loading}>{loading ? 'Lädt…' : 'Speichern'}</button>
            <button style={s.btnGhost} onClick={onBackToLoginFromReset}>Zurück zum Login</button>
          </div>
        ) : (
          <div style={s.form}>
            <div style={s.tabs}>
              <button style={mode === 'login' ? s.tabActive : s.tab} onClick={() => setMode('login')}>Login</button>
              <button style={mode === 'register' ? s.tabActive : s.tab} onClick={() => setMode('register')}>Registrieren</button>
            </div>

            {(mode === 'login' || mode === 'register' || mode === 'forgot') && (
              <Field label="E-Mail">
                <input style={s.input} type="email" placeholder="name@email.de" value={email} onChange={e => setEmail(e.target.value)} />
              </Field>
            )}
            {(mode === 'login' || mode === 'register') && (
              <Field label="Passwort">
                <input style={s.input} type="password"
                  autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                  placeholder="Min. 8 Zeichen" value={password} onChange={e => setPassword(e.target.value)} />
              </Field>
            )}
            {mode === 'register' && (
              <Field label="Anzeigename">
                <input style={s.input} type="text" placeholder="Dein Name" value={displayName} onChange={e => setDisplayName(e.target.value)} />
              </Field>
            )}
            {mode === 'reset' && (
              <Field label="Token">
                <input style={s.input} type="text" placeholder="Token" value={token} onChange={e => setToken(e.target.value)} />
              </Field>
            )}

            <button style={s.btnPrimary} onClick={submit} disabled={loading}>{label}</button>

            {mode === 'login'  && <button style={s.textBtn} onClick={() => setMode('forgot')}>Passwort vergessen?</button>}
            {mode === 'forgot' && <button style={s.textBtn} onClick={() => setMode('login')}>Zurück zum Login</button>}

            <div style={s.divider}><span style={s.dividerText}>oder</span></div>

            {googleClientId ? (
              <>
                <div ref={googleButtonRef} style={{ display: 'flex', justifyContent: 'center', minHeight: 40 }} />
                {!googleReady && !googleLoadError && <p style={s.hint}>Google Login lädt…</p>}
                {!googleReady && googleLoadError && (
                  <div>
                    <p style={s.hint}>{googleLoadError}</p>
                    <button style={s.btnGhost} onClick={onRetryGoogleRender}>Erneut versuchen</button>
                  </div>
                )}
              </>
            ) : (
              <p style={s.hint}>Google Login nicht verfügbar.</p>
            )}

            <button style={s.btnApple} disabled>
              <svg width="15" height="15" viewBox="0 0 18 18" fill="currentColor">
                <path d="M14.94 4.88a4.08 4.08 0 0 0-2.39 3.69 3.94 3.94 0 0 0 2.4 3.63 8.93 8.93 0 0 1-1.25 2.55c-.77 1.1-1.56 2.18-2.82 2.2-1.23.02-1.63-.73-3.04-.73s-1.85.71-3.01.75c-1.21.04-2.14-1.18-2.92-2.27C.32 12.54-.67 8.84.67 6.35A4.33 4.33 0 0 1 4.32 4.1c1.19-.02 2.31.8 3.04.8.72 0 2.08-.99 3.51-.85a4.28 4.28 0 0 1 3.35 1.71l.72 1.12ZM11.35.38A3.98 3.98 0 0 1 10.43 3a3.41 3.41 0 0 1-2.24 1.16A3.72 3.72 0 0 1 9.16.97 4 4 0 0 1 11.35.38Z" />
              </svg>
              Mit Apple anmelden
              <span style={s.soonBadge}>soon</span>
            </button>

            {message && <div style={s.msg}>{message}</div>}
            {onBackToLanding && <button style={s.textBtn} onClick={onBackToLanding}>← Zurück zur Startseite</button>}
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#444' }}>{label}</label>
      {children}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  root: { minHeight: '100dvh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: "'Inter',system-ui,sans-serif" },
  card: { width: '100%', maxWidth: 400, background: '#111', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, overflow: 'hidden' },
  brand: { background: '#0d0d0d', borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '28px 28px 20px', textAlign: 'center' },
  logo: { width: 40, height: 40, marginBottom: 10 },
  brandName: { fontSize: 20, fontWeight: 800, color: '#f0f0f0', marginBottom: 4 },
  brandTag: { fontSize: 12, color: '#444' },
  form: { padding: '22px 28px 28px', display: 'flex', flexDirection: 'column', gap: 14 },
  formTitle: { fontSize: 15, fontWeight: 700, color: '#f0f0f0' },
  tabs: { display: 'flex', background: '#0d0d0d', borderRadius: 8, padding: 3 },
  tab: { flex: 1, padding: '7px', borderRadius: 6, border: 'none', background: 'transparent', color: '#555', fontWeight: 600, fontSize: 13, cursor: 'pointer' },
  tabActive: { flex: 1, padding: '7px', borderRadius: 6, border: 'none', background: '#1a1a1a', color: '#f0f0f0', fontWeight: 700, fontSize: 13, cursor: 'pointer' },
  input: { padding: '9px 12px', borderRadius: 7, border: '1px solid rgba(255,255,255,0.09)', background: '#0d0d0d', color: '#f0f0f0', fontSize: 13, fontFamily: "'Inter',sans-serif", outline: 'none' },
  btnPrimary: { padding: '10px', borderRadius: 8, border: 'none', background: '#fff', color: '#0a0a0a', fontWeight: 700, fontSize: 14, cursor: 'pointer', marginTop: 2 },
  btnGhost: { padding: '9px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.09)', background: 'transparent', color: '#888', fontWeight: 600, fontSize: 13, cursor: 'pointer' },
  btnApple: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '9px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.07)', background: 'transparent', color: '#444', fontWeight: 600, fontSize: 13, cursor: 'not-allowed', opacity: 0.6 },
  soonBadge: { fontSize: 9, fontWeight: 700, background: 'rgba(255,255,255,0.06)', color: '#555', borderRadius: 99, padding: '1px 5px', marginLeft: 4 },
  textBtn: { background: 'transparent', border: 'none', color: '#555', fontSize: 12, cursor: 'pointer', textAlign: 'left', padding: 0 },
  divider: { display: 'flex', alignItems: 'center', gap: 10 },
  dividerText: { fontSize: 11, color: '#333', padding: '0 4px' },
  hint: { fontSize: 11, color: '#444', margin: 0, textAlign: 'center' },
  msg: { fontSize: 12, color: '#f0f0f0', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 7, padding: '9px 12px', whiteSpace: 'pre-wrap' },
};
