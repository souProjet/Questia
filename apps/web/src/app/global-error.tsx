'use client';

import { useEffect } from 'react';
import { IBM_Plex_Sans, IBM_Plex_Serif } from 'next/font/google';
import './globals.css';
import { AppErrorView } from '@/components/AppErrorView';

const plexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
});

const plexSerif = IBM_Plex_Serif({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
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
    <html lang="fr" className={`${plexSans.variable} ${plexSerif.variable}`}>
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
