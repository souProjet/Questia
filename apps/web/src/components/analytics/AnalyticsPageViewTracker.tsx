'use client';

import { usePathname } from '@/i18n/navigation';
import { useSearchParams } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { trackPageViewSpa } from '@/lib/analytics/track';

/**
 * Envoie un page_view sur navigation client (App Router), sans doubler le premier chargement
 * (déjà couvert par GTM / balise Google au load).
 */
export function AnalyticsPageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const first = useRef(true);

  useEffect(() => {
    const qs = searchParams?.toString();
    const path = qs ? `${pathname}?${qs}` : pathname;
    if (first.current) {
      first.current = false;
      return;
    }
    trackPageViewSpa({
      page_path: path,
      page_location: typeof window !== 'undefined' ? window.location.href : undefined,
    });
  }, [pathname, searchParams]);

  return null;
}
