/**
 * Envoi d’événements vers GTM (dataLayer), GA4 direct (gtag), et PostHog.
 * Sans consentement analytics, les événements sont mis en file puis envoyés dès « Accepter »
 * (évite de perdre onboarding_started, etc. si le bandeau est encore affiché).
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

const MAX_PENDING = 80;
const pending: Array<{ eventName: string; params?: Record<string, unknown> }> = [];

function dispatchAnalyticsEvent(eventName: string, params?: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;
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

function flushPendingAnalytics(): void {
  while (pending.length) {
    const next = pending.shift();
    if (next) dispatchAnalyticsEvent(next.eventName, next.params);
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('questia-consent-change', () => {
    if (!hasAnalyticsConsent()) {
      pending.length = 0;
      return;
    }
    /** Après les listeners sync (ex. opt-in PostHog). */
    queueMicrotask(() => flushPendingAnalytics());
  });
}

/** Pousse un événement analytics (snake_case côté noms dans events.ts). */
export function trackAnalyticsEvent(
  eventName: string,
  params?: Record<string, unknown>,
): void {
  if (typeof window === 'undefined') return;
  if (!hasAnalyticsConsent()) {
    if (pending.length < MAX_PENDING) pending.push({ eventName, params });
    return;
  }

  dispatchAnalyticsEvent(eventName, params);
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
