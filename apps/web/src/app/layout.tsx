import { Inter, Space_Grotesk } from 'next/font/google';
import { headers } from 'next/headers';
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

/**
 * Layout racine minimal : pas d’appels `getLocale()` / `getMessages()` ici — la locale
 * n’est connue qu’après le segment `[locale]` (sinon erreur 500 avec next-intl).
 * `lang` côté serveur via middleware (`x-questia-locale`) ; `<HtmlLang />` aligne les navigations client.
 */
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const h = await headers();
  const lang = h.get('x-questia-locale') ?? 'fr';
  return (
    <html lang={lang} className={`${inter.variable} ${spaceGrotesk.variable}`} suppressHydrationWarning>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
