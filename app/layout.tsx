import type { Metadata } from 'next';
import config from '@/config';
import './globals.css';

export const metadata: Metadata = {
  title: `BioArchive | NISER Biology Resources`,
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
        <meta name="theme-color" content="#0a1a0f" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body>
        {/* ── Ambient orb background (fixed, behind everything) ── */}
        <div className="orb-bg" aria-hidden="true" />

        {/* ── Loading screen ─────────────────────────────────── */}
        <div id="loading-screen" role="status" aria-label="Loading BioArchive">
          <p className="loader-wordmark">
            Bio<em>Archive</em>
          </p>
          <div className="loader-bar-wrap">
            <div className="loader-bar" />
          </div>
          <p className="loader-tag">NISER · Biological Sciences</p>
        </div>

        {/* ── Page content (revealed after load) ─────────────── */}
        <div id="page-content">
          {children}

          {/* ── Footer ───────────────────────────────────────── */}
          <footer
            style={{
              borderTop: '1px solid rgba(255,255,255,0.06)',
              padding: '40px 32px 32px',
              marginTop: 'auto',
            }}
          >
            <div
              style={{
                maxWidth: '960px',
                margin: '0 auto',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '32px',
                marginBottom: '32px',
              }}
            >
              <div>
                <p style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: '10px' }}>
                  BioArchive
                </p>
                <p style={{ fontSize: '12px', color: 'var(--text-2)', lineHeight: 1.7 }}>
                  Under active development. Help build this community by contributing your notes and resources.
                </p>
              </div>

              <div>
                <p style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: '10px' }}>
                  Disclaimer
                </p>
                <p style={{ fontSize: '12px', color: 'var(--text-2)', lineHeight: 1.7 }}>
                  BioArchive is a sharing platform only. Authors and uploaders bear no responsibility for content, errors, or losses.
                </p>
              </div>

              <div>
                <p style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: '10px' }}>
                  Support
                </p>
                <a
                  href="https://forms.gle/K6Eigw9ankXFfyFr8"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: '12px', color: 'var(--green-bright)', textDecoration: 'underline', display: 'block', marginBottom: '6px' }}
                >
                  Report an issue 📝
                </a>
              </div>
            </div>

            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <p style={{ fontSize: '11px', color: 'var(--text-3)', letterSpacing: '0.04em' }}>
                © 2026 BioArchive · NISER
              </p>
              <p style={{ fontSize: '11px', color: 'var(--text-3)' }}>
                <a
                  href="mailto:bioarchive007@gmail.com"
                  style={{ fontSize: '12px', color: 'var(--green-bright)', textDecoration: 'underline' }}
                >
                  Contact: bioarchive007@gmail.com
                </a>
              </p>
            </div>
          </footer>
        </div>

        {/* ── Loading → reveal script (suppressed hydration check) ────────────────── */}
        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                if (typeof document === 'undefined') return;
                function setupPageReveal() {
                  var screen = document.getElementById('loading-screen');
                  var page   = document.getElementById('page-content');
                  if (!screen || !page) return;
                  
                  // Reveal after bar animation completes (~1.8s total)
                  var delay = Math.max(1800, 0);
                  setTimeout(function() {
                    screen.classList.add('hidden');
                    // Small extra delay so the fade-out starts first
                    setTimeout(function() {
                      page.classList.add('visible');
                    }, 120);
                  }, delay);
                }
                
                // Run immediately and on DOM ready
                if (document.readyState === 'loading') {
                  document.addEventListener('DOMContentLoaded', setupPageReveal);
                } else {
                  setupPageReveal();
                }
              })();
            `,
          }}
        />
      </body>
    </html>
  );
}