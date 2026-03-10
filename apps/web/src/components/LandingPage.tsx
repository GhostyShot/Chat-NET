type LandingPageProps = {
  onOpenLogin: () => void;
  onOpenRegister: () => void;
};

export function LandingPage({ onOpenLogin, onOpenRegister }: LandingPageProps) {
  return (
    <main className="app-shell landing-shell">
      <section className="landing-page">

        {/* ── Nav ── */}
        <header className="landing-topbar">
          <div className="landing-brand">
            <img src="/chat-net-logo.svg" alt="Chat-Net Logo" className="landing-logo" />
            <h1>Chat-Net</h1>
          </div>
          <div className="landing-auth-actions">
            <button className="secondary compact" onClick={onOpenLogin}>
              Einloggen
            </button>
            <button className="primary compact" onClick={onOpenRegister}>
              Registrieren
            </button>
          </div>
        </header>

        {/* ── Hero ── */}
        <div className="landing-hero">
          <p className="eyebrow">Echtzeit-Kommunikation neu gedacht</p>
          <h2>Dein Space.{"\u00A0"}Dein Vibe.</h2>
          <p className="subtitle">
            Chat-Net verbindet dich mit Communities, Teams und Freunden &mdash; in Echtzeit,
            auf jedem Ger&auml;t.
          </p>
          <div className="landing-stat-row" aria-hidden="true">
            <span className="landing-stat">⚡ Echtzeit-Messaging</span>
            <span className="landing-stat">🔒 Ende-zu-Ende verschl&uuml;sselt</span>
            <span className="landing-stat">🎙️ Voice-Nachrichten</span>
            <span className="landing-stat">📊 Polls & Abstimmungen</span>
          </div>
          <div className="landing-hero-cta">
            <button className="primary landing-hero-btn" onClick={onOpenRegister}>
              Kostenlos starten
            </button>
            <button className="secondary landing-hero-btn" onClick={onOpenLogin}>
              Einloggen
            </button>
          </div>
          <div className="landing-hero-bottom-line" aria-hidden="true" />
        </div>

        {/* ── Visual Strip ── */}
        <div className="landing-visual-strip" role="presentation">
          <article className="landing-visual-card">
            <img
              src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=80"
              alt="Community-Gruppen chatten gemeinsam in Echtzeit"
              loading="lazy"
              width="600"
              height="400"
            />
            <p>Community</p>
          </article>
          <article className="landing-visual-card">
            <img
              src="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80"
              alt="Teams kommunizieren effizient mit Chat-Net"
              loading="lazy"
              width="600"
              height="400"
            />
            <p>Teams</p>
          </article>
          <article className="landing-visual-card">
            <img
              src="https://images.unsplash.com/photo-1497215842964-222b430dc094?auto=format&fit=crop&w=1200&q=80"
              alt="Gaming-Communities nutzen Chat-Net für Koordination"
              loading="lazy"
              width="600"
              height="400"
            />
            <p>Gaming</p>
          </article>
        </div>

        {/* ── Features ── */}
        <section aria-labelledby="features-heading">
          <p id="features-heading" className="landing-feature-section-label">Alles was du brauchst</p>
          <div className="landing-feature-grid">
          <div className="landing-feature-card">
            <span className="landing-feature-i">⚡</span>
            <h3>Echtzeit-Messaging</h3>
            <p>
              Nachrichten werden sofort zugestellt &mdash; kein Refresh, kein Warten.
              WebSocket-basiert f&uuml;r minimale Latenz.
            </p>
          </div>
          <div className="landing-feature-card">
            <span className="landing-feature-i">🏠</span>
            <h3>Eigene Spaces</h3>
            <p>
              Erstelle Channels f&uuml;r dein Team, deine Community oder deine Freunde.
              Mit Rollen, Moderation und Custom-Badges.
            </p>
          </div>
          <div className="landing-feature-card">
            <span className="landing-feature-i">🎙️</span>
            <h3>Voice & Media</h3>
            <p>
              Verschicke Sprachnachrichten, Bilder und Dateien direkt im Chat.
              Vollst&auml;ndige Medienunterst&uuml;tzung.
            </p>
          </div>
          <div className="landing-feature-card">
            <span className="landing-feature-i">📊</span>
            <h3>Polls & Abstimmungen</h3>
            <p>
              Frag deine Community in Sekunden. Erstelle Umfragen direkt im Channel
              und sieh Ergebnisse live.
            </p>
          </div>
          <div className="landing-feature-card">
            <span className="landing-feature-i">🔔</span>
            <h3>Smart Mentions</h3>
            <p>
              @-Erw&auml;hnungen mit Auto-Complete. Nie wieder wichtige
              Nachrichten verpassen.
            </p>
          </div>
          <div className="landing-feature-card">
            <span className="landing-feature-i">🌙</span>
            <h3>Dark &amp; Light Mode</h3>
            <p>
              Vollst&auml;ndig anpassbares Theme. Perfektes Design f&uuml;r jeden
              Einsatz &mdash; Tag und Nacht.
            </p>
          </div>
          </div>
        </section>

        {/* ── Download ── */}
        <div className="landing-store-row">
          <a
            href="#"
            className="store-badge"
            onClick={(e) => { e.preventDefault(); onOpenRegister(); }}
          >
            <span className="store-badge-label">Web-App</span>
            <strong>Im Browser &ouml;ffnen</strong>
          </a>
          <div className="store-badge">
            <span className="store-badge-label">iOS</span>
            <strong>App Store</strong>
            <span className="store-soon">Demnächst</span>
          </div>
          <div className="store-badge">
            <span className="store-badge-label">Android</span>
            <strong>Google Play</strong>
            <span className="store-soon">Demnächst</span>
          </div>
        </div>

        {/* ── Footer ── */}
        <footer className="landing-footer">
          <div className="landing-footer-inner">
            <div className="landing-footer-brand">
              <img src="/chat-net-logo.svg" alt="Chat-Net Logo" className="landing-footer-logo" />
              <span>Chat-Net</span>
            </div>
            <div className="landing-footer-links">
              <a href="https://chat-net.tech" className="landing-footer-link">chat-net.tech</a>
              <span className="landing-footer-sep">·</span>
              <button className="landing-footer-link" onClick={onOpenLogin}>Login</button>
              <span className="landing-footer-sep">·</span>
              <button className="landing-footer-link" onClick={onOpenRegister}>Registrieren</button>
            </div>
            <p className="landing-footer-copy">
              &copy; {new Date().getFullYear()} Chat-Net. Alle Rechte vorbehalten.
            </p>
          </div>
        </footer>

      </section>
    </main>
  );
}
