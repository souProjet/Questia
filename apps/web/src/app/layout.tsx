import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import { frFR } from '@clerk/localizations';
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

export const metadata: Metadata = {
  title: {
    default: 'Dopamode — Tes quêtes secondaires',
    template: '%s | Dopamode',
  },
  description: "Tu t'ennuies parce que t'as pas de quêtes secondaires. Dopamode génère ta quête quotidienne personnalisée pour sortir de ta zone de confort.",
  openGraph: {
    title: 'Dopamode — Tes quêtes secondaires',
    description: "La vie c'est pas juste travailler + dormir.",
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider localization={frFR}>
      <html lang="fr" className={`${inter.variable} ${spaceGrotesk.variable}`}>
        <body className="font-sans bg-bg-primary text-white antialiased">{children}</body>
      </html>
    </ClerkProvider>
  );
}
