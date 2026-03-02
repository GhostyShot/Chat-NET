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
            <div>
              <p className="eyebrow">chat-net.tech</p>
              <h1>Chat-Net</h1>
            </div>
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
          <p className="eyebrow">Warum Chat-Net?</p>
          <h2>Ein moderner Chat für Communities, Teams und Gamer.</h2>
          <p className="subtitle">
            Schneller Realtime-Chat, starke Gruppenfeatures, klare Rollen und ein UX, das sich wie eine moderne
            Community-Plattform anfühlt.
          </p>
          <div className="landing-stat-row" aria-label="Highlights">
            <span className="landing-stat">Realtime</span>
            <span className="landing-stat">Roles & Moderation</span>
            <span className="landing-stat">Web + Mobile</span>
          </div>
        </div>

        <div className="landing-visual-strip" aria-hidden="true">
          <article className="landing-visual-card">
            <img
              src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=80"
              alt=""
              loading="lazy"
            />
            <p>Glow Feed</p>
          </article>
          <article className="landing-visual-card">
            <img
              src="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80"
              alt=""
              loading="lazy"
            />
            <p>Neon Pulse</p>
          </article>
          <article className="landing-visual-card">
            <img
              src="https://images.unsplash.com/photo-1497215842964-222b430dc094?auto=format&fit=crop&w=1200&q=80"
              alt=""
              loading="lazy"
            />
            <p>Frost View</p>
          </article>
        </div>

        <div className="landing-feature-grid">
          <article className="landing-feature-card">
            <h3>Realtime by Default</h3>
            <p>Tippindikatoren, Presence, Read Receipts und direkte Antworten ohne Page-Reload.</p>
          </article>
          <article className="landing-feature-card">
            <h3>Community-Fokus</h3>
            <p>Owner/Admin-Moderation, Gruppenverwaltung, Mentions und klare Rollenstruktur.</p>
          </article>
          <article className="landing-feature-card">
            <h3>Modernes Interface</h3>
            <p>Dark/Light Themes, cleaner Glas-Look und mobile + web konsistent aus einem Guss.</p>
          </article>
        </div>

        <div className="landing-store-row">
          <a href="#" className="store-badge" onClick={(event) => event.preventDefault()} aria-label="App Store Coming soon">
            <span className="store-badge-label">Download on the</span>
            <strong>App Store</strong>
            <span className="store-soon">Coming soon</span>
          </a>
          <a
            href="#"
            className="store-badge"
            onClick={(event) => event.preventDefault()}
            aria-label="Google Play Coming soon"
          >
            <span className="store-badge-label">Get it on</span>
            <strong>Google Play</strong>
            <span className="store-soon">Coming soon</span>
          </a>
        </div>
      </section>
    </main>
  );
}
