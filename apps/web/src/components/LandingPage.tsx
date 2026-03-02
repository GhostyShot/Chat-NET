type LandingPageProps = {
  onOpenLogin: () => void;
  onOpenRegister: () => void;
};

export function LandingPage({ onOpenLogin, onOpenRegister }: LandingPageProps) {
  return (
    <main className="app-shell landing-shell">
      <section className="landing-page">
        <header className="landing-topbar">
          <div className="landing-brand">
            <img src="/chat-net-logo.svg" alt="Chat-Net Logo" className="landing-logo" />
            <h1>Chat-Net</h1>
          </div>
          <div className="landing-auth-actions">
            <button className="secondary compact" onClick={onOpenLogin}>
              Login
            </button>
            <button className="primary compact" onClick={onOpenRegister}>
              Registrieren
            </button>
          </div>
        </header>

        <div className="landing-hero">
          <h2>Chat f{"\u00FC"}r echte{"\u00A0"}Gespr{"\u00E4"}che.</h2>
          <p className="subtitle">
            Schnell. Sicher. Gemeinsam.
          </p>
          <div className="landing-hero-cta">
            <button className="primary landing-hero-btn" onClick={onOpenRegister}>
              Jetzt starten
            </button>
            <button className="secondary landing-hero-btn" onClick={onOpenLogin}>
              Einloggen
            </button>
          </div>
        </div>

        <div className="landing-visual-strip" aria-hidden="true">
          <article className="landing-visual-card">
            <img
              src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=80"
              alt=""
              loading="lazy"
            />
            <p>Community</p>
          </article>
          <article className="landing-visual-card">
            <img
              src="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80"
              alt=""
              loading="lazy"
            />
            <p>Teams</p>
          </article>
          <article className="landing-visual-card">
            <img
              src="https://images.unsplash.com/photo-1497215842964-222b430dc094?auto=format&fit=crop&w=1200&q=80"
              alt=""
              loading="lazy"
            />
            <p>Gaming</p>
          </article>
        </div>
      </section>
    </main>
  );
}
