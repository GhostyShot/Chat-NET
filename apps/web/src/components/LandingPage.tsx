import { useEffect, useRef } from 'react';

type LandingPageProps = {
  onOpenLogin: () => void;
  onOpenRegister: () => void;
};

const FEATURES = [
  { icon: '⚡', title: 'Echtzeit', desc: 'WebSocket-basiert. Null Latenz.' },
  { icon: '🏠', title: 'Spaces', desc: 'Channels mit Rollen & Moderation.' },
  { icon: '🎙️', title: 'Voice & Media', desc: 'Sprache, Bilder, Dateien.' },
  { icon: '📊', title: 'Polls', desc: 'Umfragen mit Live-Ergebnissen.' },
  { icon: '🔔', title: '@-Mentions', desc: 'Auto-Complete. Nie was verpassen.' },
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
      { threshold: 0.1, rootMargin: '0px 0px -32px 0px' }
    );
    document.querySelectorAll('.cn-reveal').forEach((el) =>
      observerRef.current?.observe(el)
    );
    return () => observerRef.current?.disconnect();
  }, []);

  return (
    <div className="cn-root">
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }

        .cn-root {
          min-height: 100dvh;
          background: #0a0a0a;
          color: #f2f2f2;
          font-family: 'Inter', system-ui, sans-serif;
          display: flex;
          flex-direction: column;
          overflow-x: hidden;
        }

        /* ── Nav ── */
        .cn-nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 20px;
          height: 52px;
          border-bottom: 1px solid rgba(255,255,255,0.07);
          background: rgba(10,10,10,0.92);
          backdrop-filter: blur(12px);
          position: sticky;
          top: 0;
          z-index: 100;
        }
        .cn-nav-brand { display: flex; align-items: center; gap: 8px; }
        .cn-nav-brand span { font-size: 14px; font-weight: 700; }
        .cn-nav-actions { display: flex; gap: 8px; }
        .cn-btn-ghost {
          padding: 7px 14px; border-radius: 7px;
          border: 1px solid rgba(255,255,255,0.1);
          background: transparent; color: #888;
          font-weight: 600; font-size: 13px; cursor: pointer;
          transition: color 0.15s, border-color 0.15s;
          font-family: inherit;
        }
        .cn-btn-ghost:hover { color: #e0e0e0; border-color: rgba(255,255,255,0.22); }
        .cn-btn-primary {
          padding: 7px 14px; border-radius: 7px;
          border: none; background: #fff; color: #0a0a0a;
          font-weight: 700; font-size: 13px; cursor: pointer;
          transition: background 0.15s, transform 0.1s;
          font-family: inherit;
        }
        .cn-btn-primary:hover { background: #e8e8e8; }
        .cn-btn-primary:active { transform: scale(0.97); }

        /* ── Hero ── */
        .cn-hero {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 72px 20px 56px;
          max-width: 720px;
          margin: 0 auto;
          width: 100%;
        }
        .cn-eyebrow {
          font-size: 10px; font-weight: 700;
          letter-spacing: 0.14em; text-transform: uppercase;
          color: #444; margin-bottom: 18px;
          animation: cn-fadeIn 0.7s ease both;
        }
        .cn-hero-title {
          font-size: clamp(2.2rem, 8vw, 4.8rem);
          font-weight: 800; line-height: 1.06;
          letter-spacing: -0.04em; color: #f2f2f2;
          margin-bottom: 22px;
          animation: cn-fadeUp 0.9s cubic-bezier(0.16,1,0.3,1) 0.1s both;
        }
        .cn-hero-sub {
          font-size: clamp(14px, 3vw, 17px);
          color: #666; line-height: 1.7;
          max-width: 460px; margin-bottom: 36px;
          animation: cn-fadeUp 0.9s cubic-bezier(0.16,1,0.3,1) 0.25s both;
        }
        .cn-hero-btns {
          display: flex; gap: 10px;
          justify-content: center; flex-wrap: wrap;
          margin-bottom: 28px;
          animation: cn-fadeUp 0.9s cubic-bezier(0.16,1,0.3,1) 0.4s both;
        }
        .cn-btn-hero {
          padding: 13px 30px; border-radius: 9px;
          border: none; background: #fff; color: #0a0a0a;
          font-weight: 700; font-size: 15px; cursor: pointer;
          transition: background 0.15s, transform 0.1s;
          font-family: inherit;
        }
        .cn-btn-hero:hover { background: #e8e8e8; }
        .cn-btn-hero:active { transform: scale(0.97); }
        .cn-btn-hero-ghost {
          padding: 12px 28px; border-radius: 9px;
          border: 1px solid rgba(255,255,255,0.14);
          background: transparent; color: #888;
          font-weight: 600; font-size: 15px; cursor: pointer;
          transition: border-color 0.15s, color 0.15s;
          font-family: inherit;
        }
        .cn-btn-hero-ghost:hover { border-color: rgba(255,255,255,0.28); color: #d0d0d0; }
        .cn-pills {
          display: flex; gap: 8px; flex-wrap: wrap;
          justify-content: center; margin-bottom: 56px;
          animation: cn-fadeUp 0.8s cubic-bezier(0.16,1,0.3,1) 0.55s both;
        }
        .cn-pill {
          padding: 4px 12px; border-radius: 99px;
          border: 1px solid rgba(255,255,255,0.07);
          font-size: 11px; color: #4a4a4a;
        }

        /* ── App preview ── */
        .cn-preview {
          width: 100%; max-width: 660px;
          border: 1px solid rgba(255,255,255,0.09);
          border-radius: 14px; overflow: hidden;
          background: #111;
          animation: cn-scaleIn 1.1s cubic-bezier(0.16,1,0.3,1) 0.65s both;
        }
        .cn-preview-inner {
          display: flex;
          height: clamp(180px, 40vw, 280px);
        }
        .cn-mock-sidebar {
          width: clamp(90px, 22vw, 130px);
          background: #0d0d0d;
          border-right: 1px solid rgba(255,255,255,0.06);
          padding: 10px 6px;
          display: flex; flex-direction: column; gap: 2px;
          flex-shrink: 0;
        }
        .cn-mock-ch {
          display: flex; align-items: center; gap: 5px;
          padding: 4px 6px; border-radius: 5px;
        }
        .cn-mock-ch-active { background: rgba(255,255,255,0.06); }
        .cn-mock-av {
          width: 18px; height: 18px;
          border-radius: 4px; flex-shrink: 0;
        }
        .cn-mock-ch-name { font-size: 10px; color: #555; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .cn-mock-ch-active .cn-mock-ch-name { color: #e0e0e0; }
        .cn-mock-msgs {
          flex: 1; padding: 10px 12px 8px;
          display: flex; flex-direction: column; gap: 7px;
          overflow: hidden;
        }
        .cn-mock-msg { display: flex; align-items: flex-end; gap: 5px; }
        .cn-mock-msg-av { width: 18px; height: 18px; border-radius: 4px; background: #222; flex-shrink: 0; }
        .cn-mock-bubble {
          max-width: 75%; border-radius: 6px;
          padding: 4px 8px; background: #161616;
        }
        .cn-mock-bubble-own { background: #1c1c1c; margin-left: auto; }
        .cn-mock-sender { font-size: 8px; font-weight: 700; color: #555; margin-bottom: 2px; }
        .cn-mock-text { font-size: 10px; color: #909090; line-height: 1.4; }
        .cn-mock-composer {
          margin-top: auto;
          background: #161616;
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 6px; padding: 6px 9px;
          display: flex; align-items: center;
          justify-content: space-between;
        }
        .cn-mock-composer-hint { font-size: 9px; color: #3a3a3a; }
        .cn-mock-send {
          width: 20px; height: 20px; border-radius: 4px;
          background: #1e1e1e; display: flex;
          align-items: center; justify-content: center;
          font-size: 8px; color: #555;
        }

        /* ── Sections ── */
        .cn-section-label {
          font-size: 10px; font-weight: 700;
          letter-spacing: 0.14em; text-transform: uppercase;
          color: #383838; text-align: center; margin-bottom: 32px;
        }

        /* Features */
        .cn-features {
          padding: 72px 20px;
          max-width: 960px; margin: 0 auto; width: 100%;
        }
        .cn-feature-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 12px; overflow: hidden;
        }
        .cn-feature-card {
          padding: 26px 22px;
          background: #0f0f0f;
          border-right: 1px solid rgba(255,255,255,0.06);
          border-bottom: 1px solid rgba(255,255,255,0.06);
          transition: background 0.2s;
        }
        .cn-feature-card:hover { background: #161616; }
        .cn-feature-icon { font-size: 20px; margin-bottom: 10px; }
        .cn-feature-title { font-size: 13px; font-weight: 700; color: #d0d0d0; margin-bottom: 5px; }
        .cn-feature-desc { font-size: 12px; color: #505050; line-height: 1.6; }

        /* Stats */
        .cn-stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          max-width: 960px; margin: 0 auto 72px;
          width: 100%; padding: 0 20px;
          border-top: 1px solid rgba(255,255,255,0.06);
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }
        .cn-stat {
          text-align: center; padding: 32px 12px;
          border-right: 1px solid rgba(255,255,255,0.06);
        }
        .cn-stat:last-child { border-right: none; }
        .cn-stat-num {
          font-size: clamp(1.4rem, 3vw, 2.2rem);
          font-weight: 800; color: #f2f2f2;
          letter-spacing: -0.03em; margin-bottom: 5px;
        }
        .cn-stat-label { font-size: 11px; color: #444; }

        /* CTA */
        .cn-cta {
          display: flex; flex-direction: column;
          align-items: center; text-align: center;
          padding: 72px 20px;
          border-top: 1px solid rgba(255,255,255,0.06);
          gap: 14px;
        }
        .cn-cta-title {
          font-size: clamp(1.6rem, 5vw, 2.8rem);
          font-weight: 800; color: #f2f2f2;
          letter-spacing: -0.03em;
        }
        .cn-cta-sub { font-size: 14px; color: #505050; }

        /* Footer */
        .cn-footer {
          border-top: 1px solid rgba(255,255,255,0.06);
          padding: 18px 20px;
        }
        .cn-footer-inner {
          display: flex; align-items: center;
          gap: 16px; max-width: 960px; margin: 0 auto;
          flex-wrap: wrap;
        }
        .cn-footer-brand {
          display: flex; align-items: center;
          gap: 6px; font-size: 12px; color: #2e2e2e; flex: 1;
        }
        .cn-footer-links { display: flex; align-items: center; gap: 10px; }
        .cn-footer-link {
          background: transparent; border: none;
          color: #2e2e2e; font-size: 12px; cursor: pointer;
          padding: 0; font-family: inherit;
        }
        .cn-footer-link:hover { color: #666; }
        .cn-footer-copy { color: #2a2a2a; font-size: 11px; }

        /* Scroll reveal */
        .cn-reveal {
          opacity: 0;
          transform: translateY(24px) scale(0.99);
          transition:
            opacity 0.65s cubic-bezier(0.16,1,0.3,1),
            transform 0.65s cubic-bezier(0.16,1,0.3,1);
        }
        .cn-reveal-1 { transition-delay: 0.05s; }
        .cn-reveal-2 { transition-delay: 0.11s; }
        .cn-reveal-3 { transition-delay: 0.17s; }
        .cn-reveal-4 { transition-delay: 0.23s; }
        .cn-reveal-5 { transition-delay: 0.29s; }
        .cn-reveal-6 { transition-delay: 0.35s; }

        /* Keyframes */
        @keyframes cn-fadeIn {
          from { opacity: 0; } to { opacity: 1; }
        }
        @keyframes cn-fadeUp {
          from { opacity: 0; transform: translateY(28px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes cn-scaleIn {
          from { opacity: 0; transform: scale(0.94) translateY(16px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }

        /* ── Mobile overrides ── */
        @media (max-width: 640px) {
          .cn-hero { padding: 48px 16px 40px; }
          .cn-btn-hero, .cn-btn-hero-ghost { font-size: 14px; padding: 11px 22px; }

          .cn-preview-inner { height: 200px; }
          .cn-mock-sidebar { width: 80px; padding: 8px 4px; }
          .cn-mock-ch-name { font-size: 9px; }

          .cn-features { padding: 48px 16px; }
          .cn-feature-grid { grid-template-columns: 1fr !important; }
          .cn-feature-card { border-right: none; }

          .cn-stats {
            grid-template-columns: repeat(2, 1fr) !important;
            padding: 0 16px;
            margin-bottom: 48px;
          }
          .cn-stat { padding: 24px 8px; }
          .cn-stat:nth-child(2) { border-right: none; }

          .cn-cta { padding: 48px 16px; }
          .cn-footer { padding: 16px; }
          .cn-footer-brand { display: none; }
          .cn-nav-brand span { font-size: 13px; }
        }

        @media (max-width: 480px) {
          .cn-hero-btns { flex-direction: column; align-items: center; }
          .cn-btn-hero, .cn-btn-hero-ghost { width: 100%; max-width: 280px; text-align: center; }
        }
      `}</style>

      {/* Nav */}
      <header className="cn-nav">
        <div className="cn-nav-brand">
          <img src="/chat-net-logo.svg" alt="" style={{ width: 20, height: 20 }} />
          <span>Chat-Net</span>
        </div>
        <div className="cn-nav-actions">
          <button className="cn-btn-ghost" onClick={onOpenLogin}>Login</button>
          <button className="cn-btn-primary" onClick={onOpenRegister}>Registrieren</button>
        </div>
      </header>

      {/* Hero */}
      <section className="cn-hero">
        <div className="cn-eyebrow">Echtzeit-Kommunikation</div>
        <h1 className="cn-hero-title">Dein Space.<br />Dein Vibe.</h1>
        <p className="cn-hero-sub">
          Chat-Net verbindet dich mit Teams, Communities und Freunden —
          in Echtzeit, auf jedem Gerät.
        </p>
        <div className="cn-hero-btns">
          <button className="cn-btn-hero" onClick={onOpenRegister}>Kostenlos starten</button>
          <button className="cn-btn-hero-ghost" onClick={onOpenLogin}>Einloggen</button>
        </div>
        <div className="cn-pills">
          {['⚡ Echtzeit', '🎙️ Voice', '📊 Polls', '🔒 Sicher', '👥 Gruppen'].map(t => (
            <span key={t} className="cn-pill">{t}</span>
          ))}
        </div>

        {/* App preview */}
        <div className="cn-preview">
          <div className="cn-preview-inner">
            <div className="cn-mock-sidebar">
              {['Chat-Net', 'Allgemein', 'Design', 'Dev', 'DM'].map((n, i) => (
                <div key={n} className={`cn-mock-ch${i === 1 ? ' cn-mock-ch-active' : ''}`}>
                  <div className="cn-mock-av" style={{ background: ['#2a2a2a','#333','#222','#1e1e1e','#262626'][i] }} />
                  <span className="cn-mock-ch-name">{n}</span>
                </div>
              ))}
            </div>
            <div className="cn-mock-msgs">
              {[
                { name: 'Paul', text: 'Chat-Net ist live 🎉', own: false },
                { name: 'Sarah', text: 'Das Design ist clean 🔥', own: false },
                { name: 'Du', text: 'Danke! Läuft auf Vercel', own: true },
              ].map((m, i) => (
                <div key={i} className="cn-mock-msg" style={{ justifyContent: m.own ? 'flex-end' : 'flex-start' }}>
                  {!m.own && <div className="cn-mock-msg-av" />}
                  <div className={`cn-mock-bubble${m.own ? ' cn-mock-bubble-own' : ''}`}>
                    {!m.own && <div className="cn-mock-sender">{m.name}</div>}
                    <div className="cn-mock-text">{m.text}</div>
                  </div>
                </div>
              ))}
              <div className="cn-mock-composer">
                <span className="cn-mock-composer-hint">Nachricht schreiben…</span>
                <div className="cn-mock-send">➤</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="cn-features">
        <div className="cn-section-label cn-reveal">Features</div>
        <div className="cn-feature-grid">
          {FEATURES.map((f, i) => (
            <div key={f.title} className={`cn-feature-card cn-reveal cn-reveal-${i + 1}`}>
              <div className="cn-feature-icon">{f.icon}</div>
              <div className="cn-feature-title">{f.title}</div>
              <div className="cn-feature-desc">{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Stats */}
      <div className="cn-stats">
        {[
          { num: '< 50ms', label: 'Nachrichtenlatenz' },
          { num: '100%', label: 'Kostenlos' },
          { num: '∞', label: 'Nachrichten' },
          { num: '0', label: 'Werbung' },
        ].map((s, i) => (
          <div key={s.label} className={`cn-stat cn-reveal cn-reveal-${i + 1}`}>
            <div className="cn-stat-num">{s.num}</div>
            <div className="cn-stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <section className="cn-cta">
        <div className="cn-cta-title cn-reveal">Bereit loszulegen?</div>
        <div className="cn-cta-sub cn-reveal cn-reveal-1">Kein Account-Stress. Keine Kreditkarte. Einfach starten.</div>
        <div className="cn-reveal cn-reveal-2">
          <button className="cn-btn-hero" style={{ fontSize: 15, padding: '13px 36px' }} onClick={onOpenRegister}>
            Jetzt starten
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="cn-footer">
        <div className="cn-footer-inner">
          <span className="cn-footer-brand">
            <img src="/chat-net-logo.svg" alt="" style={{ width: 13, height: 13, opacity: 0.3 }} />
            Chat-Net
          </span>
          <span className="cn-footer-links">
            <button className="cn-footer-link" onClick={onOpenLogin}>Login</button>
            <span className="cn-footer-copy">·</span>
            <button className="cn-footer-link" onClick={onOpenRegister}>Registrieren</button>
            <span className="cn-footer-copy">·</span>
            <a href="https://chat-net.tech" className="cn-footer-link" style={{ textDecoration: 'none' }}>chat-net.tech</a>
          </span>
          <span className="cn-footer-copy">© {new Date().getFullYear()}</span>
        </div>
      </footer>
    </div>
  );
}
