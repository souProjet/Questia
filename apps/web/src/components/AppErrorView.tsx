'use client';

import { Link } from '@/i18n/navigation';
import { QuestiaLogo } from '@/components/QuestiaLogo';

type AppErrorViewProps = {
  reset: () => void;
  title?: string;
  description?: string;
  retryLabel?: string;
  homeLabel?: string;
};

/**
 * UI d'erreur partagée entre `error.tsx` et `global-error.tsx` (même charte que le reste du site).
 */
export function AppErrorView({
  reset,
  title = 'Un problème est survenu',
  description = "Quelque chose s'est mal passé. Tu peux réessayer ou retourner à l'accueil.",
  retryLabel = 'Réessayer',
  homeLabel = 'Accueil',
}: AppErrorViewProps) {
  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center px-4 py-12">
      <div
        className="w-full max-w-md rounded-2xl border border-[var(--border-ui-strong)] bg-[var(--card)]/95 p-8 shadow-xl backdrop-blur-sm"
        role="alert"
        aria-live="polite"
      >
        <div className="mb-6 flex flex-col items-center gap-4 text-center">
          <QuestiaLogo variant="auth" priority />
          <h1 className="font-display text-2xl font-bold tracking-tight text-[var(--text)]">{title}</h1>
          <p className="text-sm leading-relaxed text-[var(--muted)]">{description}</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button type="button" onClick={() => reset()} className="btn btn-primary btn-md w-full font-black sm:w-auto">
            {retryLabel}
          </button>
          <Link href="/" className="btn btn-ghost btn-md w-full text-center font-semibold sm:w-auto">
            {homeLabel}
          </Link>
        </div>
      </div>
    </main>
  );
}
