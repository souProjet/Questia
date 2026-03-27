import { Link } from '@/i18n/navigation';
import type { ReactNode } from 'react';
import { siteUrl } from '@/config/marketing';

export function LegalLayout({
  title,
  description,
  children,
  showSiteUrl = true,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  showSiteUrl?: boolean;
}) {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-3xl px-4 py-16 sm:py-20">
        <p className="mb-2 text-sm font-semibold text-slate-500">
          <Link href="/" className="text-orange-600 hover:underline">
            ← Accueil
          </Link>
        </p>
        <h1 className="font-display mb-2 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">{title}</h1>
        {description ? <p className="mb-6 text-sm text-slate-600">{description}</p> : null}
        <p className="mb-10 text-sm text-slate-600">
          Dernière mise à jour :{' '}
          {new Date().toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })}
          {showSiteUrl ? (
            <>
              {' · '}
              Site :{' '}
              <a href={siteUrl} className="text-orange-600 hover:underline">
                {siteUrl}
              </a>
            </>
          ) : null}
        </p>
        <div className="prose prose-slate max-w-none space-y-8 text-slate-800">{children}</div>
      </div>
    </div>
  );
}

export function IncompleteNotice() {
  return (
    <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-950">
      Les champs encore indiqués comme « à compléter » doivent être renseignés avant une mise en production
      (variables <code className="rounded bg-amber-100 px-1">NEXT_PUBLIC_LEGAL_*</code> dans l’hébergeur — voir{' '}
      <code className="rounded bg-amber-100 px-1">.env.example</code>).
    </p>
  );
}
