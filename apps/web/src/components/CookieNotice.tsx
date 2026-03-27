'use client';

import { Link } from '@/i18n/navigation';
import { useEffect, useState } from 'react';
import { CONSENT_STORAGE_KEY, writeMarketingConsent } from '@/lib/analytics/consent';

export function CookieNotice() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (typeof window === 'undefined') return;
      if (localStorage.getItem(CONSENT_STORAGE_KEY)) {
        setVisible(false);
        return;
      }
      setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[100] border-t border-slate-200/90 bg-white/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] shadow-[0_-8px_32px_rgba(15,23,42,0.12)] backdrop-blur-md sm:px-6"
      role="dialog"
      aria-labelledby="cookie-notice-title"
      aria-live="polite"
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <p id="cookie-notice-title" className="min-w-0 text-sm leading-relaxed text-slate-600">
          Ce site utilise des cookies pour le fonctionnement et, si tu l’acceptes, pour la mesure d’audience et la
          publicité.{' '}
          <Link href="/legal/confidentialite#cookies" className="font-semibold text-orange-600 hover:underline">
            En savoir plus
          </Link>
        </p>
        <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
          <button
            type="button"
            onClick={() => {
              writeMarketingConsent({ analytics: false, ads: false });
              setVisible(false);
            }}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
          >
            Refuser
          </button>
          <button
            type="button"
            onClick={() => {
              writeMarketingConsent({ analytics: true, ads: true });
              setVisible(false);
            }}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-800"
          >
            Accepter
          </button>
        </div>
      </div>
    </div>
  );
}
