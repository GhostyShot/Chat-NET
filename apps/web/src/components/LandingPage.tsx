import { useEffect, useRef } from 'react';

type LandingPageProps = {
  onOpenLogin: () => void;
  onOpenRegister: () => void;
};

const FEATURES = [
  { icon: '⚡', title: 'Echtzeit-Messaging', desc: 'WebSocket-basiert. Null Latenz, kein Refresh.' },
  { icon: '🏠', title: 'Spaces & Gruppen', desc: 'Channels für Teams und Communities mit Rollen.' },
  { icon: '🎙️', title: 'Voice & Media', desc: 'Sprachnachrichten, Bilder und Dateien.' },
  { icon: '📊', title: 'Polls', desc: 'Umfragen erstellen, live Ergebnisse sehen.' },
  { icon: '🔔', title: '@-Mentions', desc: 'Auto-Complete. Nie mehr was verpassen.' },
  { icon: '🔒', title: 'Sicher', desc: 'Rate-Limiting, Auth, keine Werbung.' },
];

export function LandingPage({ onOpenLogin, onOpenRegister }: LandingPageProps) {
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).style.opacity = '1';
            (entry.target as HTMLElement).style.transform = 'translateY(0) scale(1)';
            observerRef.current?.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );

    document.querySelectorAll('.reveal').forEach((el) => {
      observerRef.current?.observe(el);
    });

    return () => observerRef.current?.disconnect();
  }, []);

  return (
    <div style={s.root}>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(32px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.94) translateY(16px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        .hero-title {
          animation: fadeUp 0.9s cubic-bezier(0.16,1,0.3,1) 0.1s both;
        }
        .hero-eyebrow {
          animation: fadeIn 0.7s ease 0s both;
        }
        .hero-sub {
          animation: fadeUp 0.9s cubic-bezier(0.16,1,0.3,1) 0.25s both;
        }
        .hero-actions {
          animation: fadeUp 0.9s cubic-bezier(0.16,1,0.3,1) 0.4s both;
        }
        .hero-pills {
          animation: fadeUp 0.8s cubic-bezier(0.16,1,0.3,1) 0.55s both;
        }
        .hero-preview {
          animation: scaleIn 1.1s cubic-bezier(0.16,1,0.3,1) 0.65s both;
        }
        .reveal {
          opacity: 0;
          transform: translateY(28px) scale(0.98);
          transition: opacity 0.7s cubic-bezier(0.16,1,0.3,1),
                      transform 0.7s cubic-bezier(0.16,1,0.3,1);
        }
        .reveal-delay-1 { transition-delay: 0.05s; }
        .reveal-delay-2 { transition-delay: 0.12s; }
        .reveal-delay-3 { transition-delay: 0.19s; }
        .reveal-delay-4 { transition-delay: 0.26s; }
        .reveal-delay-5 { transition-delay: 0.33s; }
        .reveal-delay-6 { transition-delay: 0.40s; }
        .btn-hero-primary:hover  { background: #e0e0e0 !important; }
        .btn-hero-primary:active { transform: scale(0.97); }
        .btn-hero-ghost:hover  { border-color: rgba(255,255,255,0.3) !important; color: #e0e0e0 !important; }
        .feature-card:hover { border-color: rgba(255,255,255,0.12) !important; background: #161616 !important; }
        .nav-login:hover   { color: #e0e0e0 !important; }
        .nav-register:hover { background: #e0e0e0 !important; }
        @media (max-width: 640px) {
          .hero-title-el { font-size: 2.4rem !important; }
          .feature-grid-el { grid-template-columns: 1fr !important; }
          .hero-preview-inner { height: 200px !important; }
        }
      `}</style>

      {/* Nav */}
      <header style={s.nav}>
        <div style={s.navBrand}>
          <img src="/chat-net-logo.svg" alt="" style={{ width: 20, height: 20 }} />
          <span style={s.navTitle}>Chat-Net</span>
        </div>
        <div style={s.navRight}>
          <button className="nav-login" style={s.navLogin} onClick={onOpenLogin}>Login</button>
          <button className="nav-register" style={s.navRegister} onClick={onOpenRegister}>Registrieren</button>
        </div>
      </header>

      {/* Hero */}
      <section style={s.hero}>
        <div className="hero-eyebrow" style={s.eyebrow}>Echtzeit-Kommunikation</div>
        <h1 className="hero-title hero-title-el" style={s.heroTitle}>
          Dein Space.<br />Dein Vibe.
        </h1>
        <p className="hero-sub" style={s.heroSub}>
          Chat-Net verbindet dich mit Teams, Communities und Freunden —
          in Echtzeit, auf jedem Gerät.
        </p>
        <div className="hero-actions" style={s.heroActions}>
          <button className="btn-hero-primary" style={s.btnHeroPrimary} onClick={onOpenRegister}>
            Kostenlos starten
          </button>
          <button className="btn-hero-ghost" style={s.btnHeroGhost} onClick={onOpenLogin}>
            Einloggen
          </button>
        </div>
        <div className="hero-pills" style={s.heroPills}>
          {['⚡ Echtzeit', '🎙️ Voice', '📊 Polls', '🔒 Sicher', '👥 Gruppen'].map(t => (
            <span key={t} style={s.pill}>{t}</span>
          ))}
        </div>

        {/* App preview mockup */}
        <div className="hero-preview" style={s.heroPreview}>
          <div style={s.heroPreviewInner} className="hero-preview-inner">
            {/* Fake sidebar */}
            <div style={s.mockSidebar}>
              {['Chat-Net', 'Allgemein', 'Design', 'Dev', 'Direkt'].map((n, i) => (
                <div key={n} style={{ ...s.mockChannel, ...(i === 1 ? s.mockChannelActive : {}) }}>
                  <div style={{ ...s.mockAvatar, background: ['#333','#2a2a2a','#222','#1e1e1e','#282828'][i] }} />
                  <span style={{ fontSize: 11, color: i === 1 ? '#f2f2f2' : '#666' }}>{n}</span>
                </div>
              ))}
            </div>
            {/* Fake messages */}
            <div style={s.mockMessages}>
              {[
                { name: 'Paul', text: 'Hey, Chat-Net ist live! 🎉', own: false },
                { name: 'Sarah', text: 'Wow, das Design ist clean 🔥', own: false },
                { name: 'Du', text: 'Danke! Läuft auf Vercel + Render', own: true },
                { name: 'Paul', text: 'Realtime via Socket.io ist so smooth', own: false },
              ].map((m, i) => (
                <div key={i} style={{ ...s.mockMsg, justifyContent: m.own ? 'flex-end' : 'flex-start' }}>
                  {!m.own && <div style={s.mockMsgAvatar} />}
                  <div style={{ ...s.mockBubble, background: m.own ? '#1e1e1e' : '#161616', textAlign: m.own ? 'right' : 'left' }}>
                    {!m.own && <div style={s.mockMsgName}>{m.name}</div>}
                    <div style={s.mockMsgText}>{m.text}</div>
                  </div>
                </div>
              ))}
              {/* Composer */}
              <div style={s.mockComposer}>
                <span style={{ fontSize: 10, color: '#444' }}>Nachricht schreiben…</span>
                <div style={s.mockSendBtn}>➤</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section style={s.featuresSection}>
        <div className="reveal" style={s.sectionLabel}>Features</div>
        <div className="feature-grid-el" style={s.featureGrid}>
          {FEATURES.map((f, i) => (
            <div
              key={f.title}
              className={`feature-card reveal reveal-delay-${i + 1}`}
              style={s.featureCard}
            >
              <div style={s.featureIcon}>{f.icon}</div>
              <div style={s.featureTitle}>{f.title}</div>
              <div style={s.featureDesc}>{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Stats */}
      <section style={s.statsSection}>
        {[
          { num: '< 50ms', label: 'Nachrichtenlatenz' },
          { num: '100%', label: 'Kostenlos' },
          { num: '∞', label: 'Nachrichten' },
          { num: '0', label: 'Werbung' },
        ].map((stat, i) => (
          <div key={stat.label} className={`reveal reveal-delay-${i + 1}`} style={s.stat}>
            <div style={s.statNum}>{stat.num}</div>
            <div style={s.statLabel}>{stat.label}</div>
          </div>
        ))}
      </section>

      {/* CTA */}
      <section style={s.ctaSection}>
        <div className="reveal" style={s.ctaTitle}>Bereit loszulegen?</div>
        <div className="reveal reveal-delay-1" style={s.ctaSub}>Kein Account-Stress. Keine Kreditkarte. Einfach starten.</div>
        <div className="reveal reveal-delay-2">
          <button className="btn-hero-primary" style={{ ...s.btnHeroPrimary, fontSize: 15, padding: '13px 36px' }} onClick={onOpenRegister}>
            Jetzt starten
          </button>
        </div>
      </section>

      <footer style={s.footer}>
        <div style={s.footerInner}>
          <span style={s.footerBrand}>
            <img src="/chat-net-logo.svg" alt="" style={{ width: 14, height: 14, opacity: 0.3 }} />
            Chat-Net
          </span>
          <span style={s.footerLinks}>
            <button style={s.footerLink} onClick={onOpenLogin}>Login</button>
            <span style={{ color: '#2a2a2a' }}>·</span>
            <button style={s.footerLink} onClick={onOpenRegister}>Registrieren</button>
            <span style={{ color: '#2a2a2a' }}>·</span>
            <a href="https://chat-net.tech" style={{ ...s.footerLink, textDecoration: 'none' }}>chat-net.tech</a>
          </span>
          <span style={{ color: '#2a2a2a', fontSize: 11 }}>© {new Date().getFullYear()}</span>
        </div>
      </footer>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  root: {
    minHeight: '100dvh',
    background: '#0a0a0a',
    color: '#f2f2f2',
    fontFamily: "'Inter', system-ui, sans-serif",
    display: 'flex',
    flexDirection: 'column',
    overflowX: 'hidden',
  },
  nav: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 28px',
    height: 52,
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    background: 'rgba(10,10,10,0.92)',
    backdropFilter: 'blur(12px)',
    position: 'sticky',
    top: 0,
    zIndex: 10,
  },
  navBrand: { display: 'flex', alignItems: 'center', gap: 8 },
  navTitle: { fontSize: 14, fontWeight: 700, color: '#f2f2f2' },
  navRight: { display: 'flex', gap: 8 },
  navLogin: { padding: '6px 14px', borderRadius: 7, border: 'none', background: 'transparent', color: '#666', fontWeight: 600, fontSize: 13, cursor: 'pointer', transition: 'color 0.15s' },
  navRegister: { padding: '6px 14px', borderRadius: 7, border: 'none', background: '#fff', color: '#0a0a0a', fontWeight: 700, fontSize: 13, cursor: 'pointer', transition: 'background 0.15s' },
  hero: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '96px 24px 80px',
    textAlign: 'center',
    maxWidth: 740,
    margin: '0 auto',
    width: '100%',
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.14em',
    textTransform: 'uppercase' as const,
    color: '#444',
    marginBottom: 20,
  },
  heroTitle: {
    fontSize: 'clamp(2.8rem, 7vw, 5rem)',
    fontWeight: 800,
    lineHeight: 1.05,
    margin: '0 0 24px',
    letterSpacing: '-0.04em',
    color: '#f2f2f2',
  },
  heroSub: {
    fontSize: 17,
    color: '#707070',
    lineHeight: 1.7,
    margin: '0 0 40px',
    maxWidth: 500,
  },
  heroActions: { display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' as const, marginBottom: 32 },
  btnHeroPrimary: {
    padding: '12px 28px',
    borderRadius: 9,
    border: 'none',
    background: '#fff',
    color: '#0a0a0a',
    fontWeight: 700,
    fontSize: 14,
    cursor: 'pointer',
    transition: 'background 0.15s, transform 0.1s',
    fontFamily: "'Inter', sans-serif",
  },
  btnHeroGhost: {
    padding: '12px 28px',
    borderRadius: 9,
    border: '1px solid rgba(255,255,255,0.12)',
    background: 'transparent',
    color: '#888',
    fontWeight: 600,
    fontSize: 14,
    cursor: 'pointer',
    transition: 'border-color 0.15s, color 0.15s',
    fontFamily: "'Inter', sans-serif",
  },
  heroPills: { display: 'flex', gap: 8, flexWrap: 'wrap' as const, justifyContent: 'center', marginBottom: 60 },
  pill: { padding: '4px 12px', borderRadius: 99, border: '1px solid rgba(255,255,255,0.07)', fontSize: 12, color: '#4a4a4a' },
  heroPreview: { width: '100%', maxWidth: 680 },
  heroPreviewInner: {
    height: 280,
    background: '#111',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 14,
    overflow: 'hidden',
    display: 'flex',
  },
  mockSidebar: {
    width: 130,
    background: '#0d0d0d',
    borderRight: '1px solid rgba(255,255,255,0.06)',
    padding: '10px 6px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 2,
    flexShrink: 0,
  },
  mockChannel: { display: 'flex', alignItems: 'center', gap: 6, padding: '5px 6px', borderRadius: 5 },
  mockChannelActive: { background: 'rgba(255,255,255,0.06)' },
  mockAvatar: { width: 20, height: 20, borderRadius: 5, flexShrink: 0 },
  mockMessages: { flex: 1, padding: '12px 14px 8px', display: 'flex', flexDirection: 'column' as const, gap: 8, overflow: 'hidden' },
  mockMsg: { display: 'flex', alignItems: 'flex-end', gap: 6 },
  mockMsgAvatar: { width: 20, height: 20, borderRadius: 5, background: '#222', flexShrink: 0 },
  mockBubble: { maxWidth: '75%', borderRadius: 7, padding: '5px 9px' },
  mockMsgName: { fontSize: 9, fontWeight: 700, color: '#555', marginBottom: 2 },
  mockMsgText: { fontSize: 11, color: '#a0a0a0', lineHeight: 1.4 },
  mockComposer: {
    marginTop: 'auto',
    background: '#161616',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 7,
    padding: '7px 10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mockSendBtn: { width: 22, height: 22, borderRadius: 5, background: '#1e1e1e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#555' },
  featuresSection: { padding: '80px 24px', maxWidth: 960, margin: '0 auto', width: '100%' },
  sectionLabel: { fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' as const, color: '#383838', textAlign: 'center' as const, marginBottom: 36 },
  featureGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, overflow: 'hidden' },
  featureCard: {
    padding: '28px 24px',
    background: '#0f0f0f',
    borderRight: '1px solid rgba(255,255,255,0.06)',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    transition: 'background 0.2s, border-color 0.2s',
    cursor: 'default',
  },
  featureIcon: { fontSize: 22, marginBottom: 12 },
  featureTitle: { fontSize: 14, fontWeight: 700, color: '#d0d0d0', marginBottom: 6 },
  featureDesc: { fontSize: 13, color: '#5a5a5a', lineHeight: 1.6 },
  statsSection: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4,1fr)',
    gap: 1,
    maxWidth: 960,
    margin: '0 auto 80px',
    width: '100%',
    padding: '0 24px',
  },
  stat: { textAlign: 'center' as const, padding: '36px 16px', borderRight: '1px solid rgba(255,255,255,0.06)' },
  statNum: { fontSize: 'clamp(1.6rem,3vw,2.4rem)', fontWeight: 800, color: '#f2f2f2', letterSpacing: '-0.03em', marginBottom: 6 },
  statLabel: { fontSize: 12, color: '#484848' },
  ctaSection: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    textAlign: 'center' as const,
    padding: '80px 24px',
    borderTop: '1px solid rgba(255,255,255,0.06)',
    gap: 16,
  },
  ctaTitle: { fontSize: 'clamp(1.8rem,4vw,3rem)', fontWeight: 800, color: '#f2f2f2', letterSpacing: '-0.03em' },
  ctaSub: { fontSize: 15, color: '#5a5a5a', marginBottom: 8 },
  footer: { borderTop: '1px solid rgba(255,255,255,0.06)', padding: '20px 28px' },
  footerInner: { display: 'flex', alignItems: 'center', gap: 20, maxWidth: 960, margin: '0 auto' },
  footerBrand: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#333', flex: 1 },
  footerLinks: { display: 'flex', alignItems: 'center', gap: 10 },
  footerLink: { background: 'transparent', border: 'none', color: '#333', fontSize: 12, cursor: 'pointer', padding: 0 },
};
