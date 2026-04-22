import { IBM_Plex_Sans, IBM_Plex_Serif } from 'next/font/google';
import { headers } from 'next/headers';
import './globals.css';

const plexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
});

const plexSerif = IBM_Plex_Serif({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-space',
  display: 'swap',
});

/**
 * Layout racine minimal : pas d'appels `getLocale()` / `getMessages()` ici — la locale
 * n'est connue qu'après le segment `[locale]` (sinon erreur 500 avec next-intl).
 * `lang` côté serveur via middleware (`x-questia-locale`) ; `<HtmlLang />` aligne les navigations client.
 */
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const h = await headers();
  const lang = h.get('x-questia-locale') ?? 'fr';
  return (
    <html lang={lang} className={`${plexSans.variable} ${plexSerif.variable}`} suppressHydrationWarning>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
