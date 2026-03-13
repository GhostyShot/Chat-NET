type LandingPageProps = {
  onOpenLogin: () => void;
  onOpenRegister: () => void;
};

export function LandingPage({ onOpenLogin, onOpenRegister }: LandingPageProps) {
  return (
    <div style={s.root}>
      <header style={s.nav}>
        <div style={s.navBrand}>
          <img src="/chat-net-logo.svg" alt="" style={{ width: 20, height: 20 }} />
          <span style={s.navTitle}>Chat-Net</span>
        </div>
        <div style={s.navRight}>
          <button style={s.btnGhost} onClick={onOpenLogin}>Login</button>
          <button style={s.btnPrimary} onClick={onOpenRegister}>Registrieren</button>
        </div>
      </header>

      <section style={s.hero}>
        <div style={s.heroEyebrow}>Echtzeit-Kommunikation</div>
        <h1 style={s.heroTitle}>Dein Space.&nbsp;Dein Vibe.</h1>
        <p style={s.heroSub}>
          Chat-Net verbindet dich mit Teams, Communities und Freunden — in Echtzeit, auf jedem Gerät.
        </p>
        <div style={s.heroActions}>
          <button style={s.btnHero} onClick={onOpenRegister}>Kostenlos starten</button>
          <button style={s.btnHeroGhost} onClick={onOpenLogin}>Einloggen</button>
        </div>
        <div style={s.heroStats}>
          {['⚡ Echtzeit', '🎙️ Voice', '📊 Polls', '🔒 Sicher', '👤 Gruppen'].map(t => (
            <span key={t} style={s.statPill}>{t}</span>
          ))}
        </div>
      </section>

      <div style={s.divider} />

      <section style={s.features}>
        <p style={s.sectionLabel}>Features</p>
        <div style={s.grid}>
          {FEATURES.map(f => (
            <div key={f.title} style={s.card}>
              <div style={s.cardIcon}>{f.icon}</div>
              <div style={s.cardTitle}>{f.title}</div>
              <div style={s.cardDesc}>{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      <div style={s.divider} />

      <section style={s.cta}>
        <h2 style={s.ctaTitle}>Bereit loszulegen?</h2>
        <p style={s.ctaSub}>Kostenlos, kein Account-Stress, sofort startklar.</p>
        <button style={s.btnHero} onClick={onOpenRegister}>Jetzt starten</button>
      </section>

      <footer style={s.footer}>
        <span style={s.footerBrand}>
          <img src="/chat-net-logo.svg" alt="" style={{ width: 14, height: 14, opacity: 0.4 }} />
          Chat-Net
        </span>
        <span style={s.footerLinks}>
          <button style={s.footerLink} onClick={onOpenLogin}>Login</button>
          <span style={{ color: '#333' }}>/</span>
          <button style={s.footerLink} onClick={onOpenRegister}>Registrieren</button>
        </span>
        <span style={{ color: '#333', fontSize: 11 }}>© {new Date().getFullYear()}</span>
      </footer>
    </div>
  );
}

const FEATURES = [
  { icon: '⚡', title: 'Echtzeit-Messaging', desc: 'WebSocket-basiert. Keine Verzögerung, kein Refresh.' },
  { icon: '🏠', title: 'Spaces & Gruppen', desc: 'Channels für Teams, Communitys und Freunde mit Rollen.' },
  { icon: '🎙️', title: 'Voice & Media', desc: 'Sprachnachrichten, Bilder und Dateien im Chat.' },
  { icon: '📊', title: 'Polls', desc: 'Umfragen erstellen, live Ergebnisse verfolgen.' },
  { icon: '🔔', title: '@-Mentions', desc: 'Auto-Complete für Erwähnungen. Nie mehr was verpassen.' },
  { icon: '🚫', title: 'Blockieren', desc: 'Unerwünschte Nutzer direkt blockieren.' },
];

const s: Record<string, React.CSSProperties> = {
  root: {
    minHeight: '100dvh',
    background: '#0a0a0a',
    color: '#f0f0f0',
    fontFamily: "'Inter', system-ui, sans-serif",
    display: 'flex',
    flexDirection: 'column',
  },
  nav: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 28px',
    height: 52,
    borderBottom: '1px solid rgba(255,255,255,0.07)',
    background: '#0d0d0d',
    position: 'sticky',
    top: 0,
    zIndex: 10,
  },
  navBrand: { display: 'flex', alignItems: 'center', gap: 8 },
  navTitle: { fontSize: 14, fontWeight: 700 },
  navRight: { display: 'flex', gap: 8 },
  btnGhost: {
    padding: '7px 16px', borderRadius: 7,
    border: '1px solid rgba(255,255,255,0.1)',
    background: 'transparent', color: '#888', fontWeight: 600, fontSize: 13, cursor: 'pointer',
  },
  btnPrimary: {
    padding: '7px 16px', borderRadius: 7,
    border: 'none', background: '#fff', color: '#0a0a0a',
    fontWeight: 700, fontSize: 13, cursor: 'pointer',
  },
  hero: {
    flex: 1, display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    padding: '80px 24px 60px', textAlign: 'center',
    maxWidth: 640, margin: '0 auto', width: '100%',
  },
  heroEyebrow: {
    fontSize: 11, fontWeight: 700, letterSpacing: '0.12em',
    textTransform: 'uppercase', color: '#555', marginBottom: 16,
  },
  heroTitle: {
    fontSize: 'clamp(2.2rem, 6vw, 3.8rem)',
    fontWeight: 800, lineHeight: 1.1,
    margin: '0 0 20px', letterSpacing: '-0.03em',
  },
  heroSub: {
    fontSize: 16, color: '#666', lineHeight: 1.7,
    margin: '0 0 36px', maxWidth: 480,
  },
  heroActions: { display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 28 },
  btnHero: {
    padding: '11px 28px', borderRadius: 8,
    border: 'none', background: '#fff', color: '#0a0a0a',
    fontWeight: 700, fontSize: 14, cursor: 'pointer',
  },
  btnHeroGhost: {
    padding: '10px 26px', borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.12)',
    background: 'transparent', color: '#888', fontWeight: 600, fontSize: 14, cursor: 'pointer',
  },
  heroStats: { display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' },
  statPill: {
    padding: '4px 12px', borderRadius: 99,
    border: '1px solid rgba(255,255,255,0.08)',
    fontSize: 12, color: '#555',
  },
  divider: { height: 1, background: 'rgba(255,255,255,0.07)', margin: '0 24px' },
  features: { padding: '52px 24px', maxWidth: 900, margin: '0 auto', width: '100%' },
  sectionLabel: {
    fontSize: 10, fontWeight: 700, letterSpacing: '0.12em',
    textTransform: 'uppercase', color: '#444', textAlign: 'center', marginBottom: 32,
  },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 1 },
  card: {
    padding: '24px 20px',
    borderRight: '1px solid rgba(255,255,255,0.07)',
    borderBottom: '1px solid rgba(255,255,255,0.07)',
  },
  cardIcon: { fontSize: 22, marginBottom: 10 },
  cardTitle: { fontSize: 14, fontWeight: 700, marginBottom: 6 },
  cardDesc: { fontSize: 13, color: '#555', lineHeight: 1.6 },
  cta: {
    padding: '60px 24px',
    maxWidth: 500, margin: '0 auto', width: '100%',
    textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
  },
  ctaTitle: { fontSize: 'clamp(1.4rem,3vw,2rem)', fontWeight: 800, letterSpacing: '-0.02em' },
  ctaSub: { fontSize: 14, color: '#555', margin: 0 },
  footer: {
    borderTop: '1px solid rgba(255,255,255,0.07)',
    padding: '16px 28px',
    display: 'flex', alignItems: 'center', gap: 16,
    fontSize: 12, color: '#444',
  },
  footerBrand: { display: 'flex', alignItems: 'center', gap: 6, flex: 1 },
  footerLinks: { display: 'flex', alignItems: 'center', gap: 6 },
  footerLink: {
    background: 'transparent', border: 'none',
    color: '#444', fontSize: 12, cursor: 'pointer',
  },
};
