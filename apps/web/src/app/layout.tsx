import { Inter, Space_Grotesk } from 'next/font/google';
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
 * `lang` est mis à jour côté client via `<HtmlLang />` dans `[locale]/layout`.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${inter.variable} ${spaceGrotesk.variable}`} suppressHydrationWarning>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
