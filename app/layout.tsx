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
        {/* FIX 1: Removed string escape slashes so that content is evaluated as a true string primitive */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body suppressHydrationWarning>
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

        {/* ── Page Layout ────────────────────────────────────── */}
        {/* FIX 2: Re-aligned default class names to keep initial client-hydration matches clean */}
        <div id="page-content" className="layout-root">
          {/* Main layout container wrapper view */}
          <main className="layout-main">{children}</main>

          {/* Persistent global footer section */}
          <footer className="layout-footer">
            <div className="footer-container">
              <p className="footer-text">
                BioArchive © {new Date().getFullYear()} · Managed by NISER Biology Community
              </p>
              <p className="footer-subtext">
                Contributed materials are property of respective course authors and instructors.
              </p>
            </div>
          </footer>
        </div>

        {/* ── Loading → reveal script ────────────────── */}
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
                  
                  var delay = 1800;
                  setTimeout(function() {
                    screen.style.opacity = '0';
                    screen.style.pointerEvents = 'none';
                    setTimeout(function() {
                      screen.style.display = 'none';
                      // FIX 3: Directly update element layout styles to bypass hydration mismatch locks safely
                      page.style.opacity = '1';
                      page.style.visibility = 'visible';
                    }, 300);
                  }, delay);
                }
                
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