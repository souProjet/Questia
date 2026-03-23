import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import { frFR } from '@clerk/localizations';
import { Inter, Space_Grotesk } from 'next/font/google';
import { siteUrl } from '@/config/marketing';
import './globals.css';

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
    default: 'Dopamode — App de quêtes quotidiennes dans la vraie vie',
    template: '%s | Dopamode',
  },
  description:
    'Dopamode est l’app qui te donne une quête IRL par jour : motivation, sorties et défis adaptés à ton profil et à ton rythme. Gratuit pour commencer.',
  openGraph: {
    title: 'Dopamode — App de quêtes quotidiennes dans la vraie vie',
    description:
      'Transforme ton quotidien en jeu d’aventure : missions courtes, concrètes, sans culpabiliser.',
    type: 'website',
    locale: 'fr_FR',
    siteName: 'Dopamode',
  },
  twitter: {
    card: 'summary',
    title: 'Dopamode — App de quêtes quotidiennes IRL',
    description:
      'Une quête par jour dans ta vraie vie. iOS, Android et web.',
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider localization={frFR}>
      <html lang="fr" className={`${inter.variable} ${spaceGrotesk.variable}`}>
        {/* Pas de text-white / fond sombre sur body : ça forçait du texte blanc partout (Clerk + auth illisibles). globals.css définit déjà --text / --bg. */}
        <body className="font-sans antialiased">
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
