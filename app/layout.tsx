import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Navbar from '@/components/Navbar';
import config from '@/config';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: `${config.SITE_NAME} | NISER Biology Resources`,
  description: config.SITE_TAGLINE,
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} scroll-smooth`}>
      <head>
        <meta name="theme-color" content="#1a4a2e" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="font-inter bg-[#f8f7f4] text-[#1c1c1e]">
        <Navbar />
        <main className="min-h-screen">
          {children}
        </main>
        <footer className="bg-[#1a4a2e] text-white py-8 mt-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
              <div>
                <h3 className="font-bold mb-2 text-amber-300">About</h3>
                <p className="text-sm text-gray-300">
                  BIO-Archive is actively under development. Help us in building this community by contributing your notes and resources.
                </p>
              </div>
              <div>
                <h3 className="font-bold mb-2 text-amber-300">Disclaimer</h3>
                <ul className="text-sm text-gray-300 space-y-1">
                  <li>The BIO-Archive is solely a sharing platform. BIO-Archive, authors, and uploaders bear no responsibility for content, errors, or losses. Please exercise caution, cross-check information, and use at your own discretion.</li>                  
                </ul>
              </div>
              <div>
                <h3 className="font-bold mb-2 text-amber-300">Support</h3>
                <p className="text-sm text-gray-300">
                  <a href='https://forms.gle/K6Eigw9ankXFfyFr8'> 📝 Report issues to BIO-Archive</a>
                </p>
              </div>
            </div>
            <div className="border-t border-white/20 pt-6 text-center text-sm text-gray-400">
              <p>© 2026 {config.SITE_NAME} | Contact: <a href='bioarchive007@gmail.com'>bioarchive007@gmail.com</a></p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
