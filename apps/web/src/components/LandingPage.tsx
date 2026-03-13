type LandingPageProps = {
  onOpenLogin: () => void;
  onOpenRegister: () => void;
};

export function LandingPage({ onOpenLogin, onOpenRegister }: LandingPageProps) {
  return (
    <div style={styles.root}>
      {/* Nav */}
      <header style={styles.nav}>
        <div style={styles.navBrand}>
          <img src="/chat-net-logo.svg" alt="Chat-Net" style={styles.navLogo} />
          <span style={styles.navTitle}>Chat-Net</span>
        </div>
        <div style={styles.navActions}>
          <button style={styles.btnGhost} onClick={onOpenLogin}>Einloggen</button>
          <button style={styles.btnPrimary} onClick={onOpenRegister}>Registrieren</button>
        </div>
      </header>

      {/* Hero */}
      <section style={styles.hero}>
        <span style={styles.eyebrow}>Echtzeit-Kommunikation</span>
        <h1 style={styles.heroTitle}>Dein Space.&nbsp;Dein Vibe.</h1>
        <p style={styles.heroSub}>
          Chat-Net verbindet dich mit Communities, Teams und Freunden — in Echtzeit, auf jedem Gerät.
        </p>
        <div style={styles.heroCta}>
          <button style={styles.btnHeroPrimary} onClick={onOpenRegister}>Kostenlos starten</button>
          <button style={styles.btnHeroGhost} onClick={onOpenLogin}>Einloggen</button>
        </div>
        <div style={styles.heroStats}>
          {["⚡ Echtzeit", "🎙️ Voice", "📊 Polls", "🔒 Sicher"].map((s) => (
            <span key={s} style={styles.statChip}>{s}</span>
          ))}
        </div>
      </section>

      {/* Feature grid */}
      <section style={styles.features}>
        <p style={styles.sectionLabel}>Alles was du brauchst</p>
        <div style={styles.featureGrid}>
          {FEATURES.map((f) => (
            <div key={f.title} style={styles.featureCard}>
              <span style={styles.featureIcon}>{f.icon}</span>
              <h3 style={styles.featureTitle}>{f.title}</h3>
              <p style={styles.featureText}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA banner */}
      <section style={styles.ctaBanner}>
        <h2 style={styles.ctaTitle}>Bereit loszulegen?</h2>
        <p style={styles.ctaSub}>Erstelle deinen Account in Sekunden — kostenlos und ohne Kreditkarte.</p>
        <button style={styles.btnHeroPrimary} onClick={onOpenRegister}>Jetzt starten</button>
      </section>

      {/* Footer */}
      <footer style={styles.footer}>
        <img src="/chat-net-logo.svg" alt="" style={{ width: 20, height: 20, opacity: 0.5 }} />
        <span style={styles.footerText}>© {new Date().getFullYear()} Chat-Net</span>
        <button style={styles.footerLink} onClick={onOpenLogin}>Login</button>
        <button style={styles.footerLink} onClick={onOpenRegister}>Registrieren</button>
      </footer>
    </div>
  );
}

const FEATURES = [
  { icon: "⚡", title: "Echtzeit-Messaging", desc: "Nachrichten sofort, ohne Refresh. WebSocket-basiert für minimale Latenz." },
  { icon: "🏠", title: "Eigene Spaces", desc: "Channels für Teams, Communities oder Freunde. Mit Rollen und Moderation." },
  { icon: "🎙️", title: "Voice & Media", desc: "Sprachnachrichten, Bilder und Dateien direkt im Chat senden." },
  { icon: "📊", title: "Polls", desc: "Umfragen in Sekunden erstellen und Ergebnisse live verfolgen." },
  { icon: "🔔", title: "Smart Mentions", desc: "@-Erwähnungen mit Auto-Complete. Nie wichtige Nachrichten verpassen." },
  { icon: "🌙", title: "Dark & Light Mode", desc: "Vollständig anpassbares Theme für jeden Einsatz." },
];

const C = {
  bg: "#060b14",
  surface: "#0d1117",
  elevated: "#111827",
  border: "rgba(255,255,255,0.07)",
  accent: "#5865f2",
  accentHover: "#4752c4",
  text: "#e2e8f0",
  muted: "#64748b",
  subtle: "rgba(88,101,242,0.12)",
};

const styles: Record<string, React.CSSProperties> = {
  root: { minHeight: "100dvh", background: C.bg, color: C.text, fontFamily: "Inter, sans-serif", display: "flex", flexDirection: "column" },
  nav: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 32px", height: 60, borderBottom: `1px solid ${C.border}`, background: C.surface, position: "sticky", top: 0, zIndex: 10 },
  navBrand: { display: "flex", alignItems: "center", gap: 10 },
  navLogo: { width: 28, height: 28 },
  navTitle: { fontWeight: 700, fontSize: 18 },
  navActions: { display: "flex", gap: 10 },
  btnGhost: { padding: "8px 18px", borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent", color: C.text, fontWeight: 600, fontSize: 14, cursor: "pointer" },
  btnPrimary: { padding: "8px 18px", borderRadius: 8, border: "none", background: C.accent, color: "#fff", fontWeight: 600, fontSize: 14, cursor: "pointer" },
  hero: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 24px 60px", textAlign: "center", maxWidth: 720, margin: "0 auto", width: "100%" },
  eyebrow: { fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: C.accent, marginBottom: 16, display: "block" },
  heroTitle: { fontSize: "clamp(2rem, 5vw, 3.5rem)", fontWeight: 800, lineHeight: 1.15, margin: "0 0 20px", letterSpacing: "-0.02em" },
  heroSub: { fontSize: 18, color: C.muted, lineHeight: 1.7, margin: "0 0 36px", maxWidth: 520 },
  heroCta: { display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginBottom: 32 },
  btnHeroPrimary: { padding: "13px 30px", borderRadius: 10, border: "none", background: C.accent, color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer", boxShadow: "0 4px 20px rgba(88,101,242,0.35)" },
  btnHeroGhost: { padding: "12px 28px", borderRadius: 10, border: `1px solid ${C.border}`, background: "transparent", color: C.text, fontWeight: 600, fontSize: 15, cursor: "pointer" },
  heroStats: { display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" },
  statChip: { padding: "6px 14px", borderRadius: 20, background: C.elevated, border: `1px solid ${C.border}`, fontSize: 13, color: C.muted },
  features: { padding: "60px 24px", maxWidth: 960, margin: "0 auto", width: "100%" },
  sectionLabel: { fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: C.muted, textAlign: "center", marginBottom: 40 },
  featureGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20 },
  featureCard: { background: C.elevated, border: `1px solid ${C.border}`, borderRadius: 14, padding: "28px 24px" },
  featureIcon: { fontSize: 28, display: "block", marginBottom: 12 },
  featureTitle: { fontWeight: 700, fontSize: 15, margin: "0 0 8px" },
  featureText: { fontSize: 14, color: C.muted, lineHeight: 1.6, margin: 0 },
  ctaBanner: { margin: "0 24px 60px", maxWidth: 720, marginInline: "auto", background: C.subtle, border: `1px solid rgba(88,101,242,0.25)`, borderRadius: 18, padding: "48px 32px", textAlign: "center" },
  ctaTitle: { fontSize: "clamp(1.4rem, 3vw, 2rem)", fontWeight: 800, margin: "0 0 12px" },
  ctaSub: { fontSize: 15, color: C.muted, margin: "0 0 28px" },
  footer: { borderTop: `1px solid ${C.border}`, padding: "20px 32px", display: "flex", alignItems: "center", gap: 16, color: C.muted, fontSize: 13 },
  footerText: { flex: 1 },
  footerLink: { background: "transparent", border: "none", color: C.muted, cursor: "pointer", fontSize: 13 },
};
