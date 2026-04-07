/**
 * Envoi d’événements vers GTM (dataLayer), GA4 direct (gtag), et PostHog.
 * N’envoie rien sans consentement analytics (RGPD), sauf PostHog côté config (désactivé sans clé).
 */
import { questAnalyticsId as questAnalyticsIdFromShared } from '@questia/shared';
import { analyticsConfig } from '@/config/analytics';
import { hasAnalyticsConsent } from '@/lib/analytics/consent';
import { AnalyticsEvent } from '@/lib/analytics/events';
import { capturePostHogEvent } from '@/lib/analytics/posthog-web';

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
  }
}

/** Pousse un événement analytics (snake_case côté noms dans events.ts). */
export function trackAnalyticsEvent(
  eventName: string,
  params?: Record<string, unknown>,
): void {
  if (typeof window === 'undefined') return;
  if (!hasAnalyticsConsent()) return;

  capturePostHogEvent(eventName, params);

  if (analyticsConfig.gtmId) {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: eventName, ...params });
    return;
  }

  if (analyticsConfig.gaMeasurementId && typeof window.gtag === 'function') {
    window.gtag('event', eventName, params ?? {});
  }
}

/**
 * Vue de page SPA (navigation client Next.js). À utiliser après le premier chargement
 * pour ne pas doubler le page_view initial du conteneur GTM.
 */
export function trackPageViewSpa(payload: {
  page_path: string;
  page_location?: string;
  page_title?: string;
}): void {
  const page_location =
    payload.page_location ?? (typeof window !== 'undefined' ? window.location.href : undefined);
  trackAnalyticsEvent(AnalyticsEvent.pageView, {
    page_path: payload.page_path,
    page_location,
    page_title: payload.page_title ?? (typeof document !== 'undefined' ? document.title : undefined),
  });
}

/** Identifiant de quête stable sans PII : date + archetype. */
export const questAnalyticsId = questAnalyticsIdFromShared;
