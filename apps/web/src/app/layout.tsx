import type { Metadata, Viewport } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import { frFR } from '@clerk/localizations';
import { Inter, Space_Grotesk } from 'next/font/google';
import { siteUrl } from '@/config/marketing';
import './globals.css';
import { CookieNotice } from '@/components/CookieNotice';
import { MarketingScripts } from '@/components/analytics/MarketingScripts';
import { SkipLink } from '@/components/SkipLink';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Questia — App de quêtes quotidiennes dans la vraie vie',
    template: '%s | Questia',
  },
  description:
    'Questia est l’app qui te donne une quête IRL par jour : motivation, sorties et défis adaptés à ton profil et à ton rythme. Gratuit pour commencer.',
  openGraph: {
    title: 'Questia — App de quêtes quotidiennes dans la vraie vie',
    description:
      'Transforme ton quotidien en jeu d’aventure : missions courtes, concrètes, sans culpabiliser.',
    type: 'website',
    locale: 'fr_FR',
    siteName: 'Questia',
    images: [{ url: '/brand/questia-logo.png', width: 512, height: 512, alt: 'Questia' }],
  },
  twitter: {
    card: 'summary',
    title: 'Questia — App de quêtes quotidiennes IRL',
    description:
      'Une quête par jour dans ta vraie vie. iOS, Android et web.',
    images: ['/brand/questia-logo.png'],
  },
  robots: { index: true, follow: true },
};

/** Notch / encoche : permet d’utiliser env(safe-area-inset-*) en CSS. */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider localization={frFR}>
      <html lang="fr" className={`${inter.variable} ${spaceGrotesk.variable}`}>
        {/* Pas de text-white / fond sombre sur body : ça forçait du texte blanc partout (Clerk + auth illisibles). globals.css définit déjà --text / --bg. */}
        <body className="font-sans antialiased">
          <SkipLink />
          {children}
          <CookieNotice />
          <MarketingScripts />
        </body>
      </html>
    </ClerkProvider>
  );
}
