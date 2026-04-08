'use client';

import { useEffect } from 'react';
import { Inter, Space_Grotesk } from 'next/font/google';
import './globals.css';
import { AppErrorView } from '@/components/AppErrorView';

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
 * Erreur au niveau racine (échec du layout ou d'une erreur non interceptée plus haut).
 * Doit redéfinir `<html>` et `<body>` — sans `ClerkProvider` ni scripts marketing.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Questia global]', error.digest ?? error.message, error);
  }, [error]);

  return (
    <html lang="fr" className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <body className="font-sans antialiased">
        <AppErrorView
          reset={reset}
          title="L'application a rencontré une erreur"
          description="Une erreur critique s'est produite. Réessaie ou reviens à l'accueil."
        />
      </body>
    </html>
  );
}
