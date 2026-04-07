import posthog from 'posthog-js';
import { analyticsConfig } from '@/config/analytics';
import { hasAnalyticsConsent } from '@/lib/analytics/consent';

let initDone = false;
/** Évite un double $pageview si syncPostHogConsent est appelée plusieurs fois avec consentement déjà accordé. */
let sessionInitialPageviewSent = false;

/**
 * Initialise PostHog une fois (opt-out par défaut, aligné RGPD avec le bandeau).
 * Appelé depuis PostHogProvider côté client uniquement.
 */
export function initPostHogBrowser(): void {
  if (typeof window === 'undefined') return;
  const key = analyticsConfig.posthogKey;
  if (!key || initDone) return;
  initDone = true;

  const host = analyticsConfig.posthogHost ?? 'https://eu.i.posthog.com';

  posthog.init(key, {
    api_host: host,
    ...(analyticsConfig.posthogUiHost ? { ui_host: analyticsConfig.posthogUiHost } : {}),
    person_profiles: 'identified_only',
    capture_pageview: false,
    persistence: 'localStorage+cookie',
    opt_out_capturing_by_default: true,
    disable_session_recording: true,
    loaded: () => {
      syncPostHogConsent();
    },
  });

  const onConsent = () => syncPostHogConsent();
  window.addEventListener('questia-consent-change', onConsent);
}

/** Applique opt-in / opt-out selon le stockage consentement (bandeau cookies). */
export function syncPostHogConsent(): void {
  if (typeof window === 'undefined' || !analyticsConfig.posthogKey || !initDone) return;
  if (hasAnalyticsConsent()) {
    posthog.opt_in_capturing();
    if (!sessionInitialPageviewSent) {
      sessionInitialPageviewSent = true;
      posthog.capture('$pageview', {
        $current_url: window.location.href,
      });
    }
  } else {
    posthog.opt_out_capturing();
    sessionInitialPageviewSent = false;
  }
}

export function capturePostHogEvent(eventName: string, params?: Record<string, unknown>): void {
  if (typeof window === 'undefined' || !analyticsConfig.posthogKey) return;
  if (!hasAnalyticsConsent()) return;
  posthog.capture(eventName, params);
}

export function identifyPostHogUser(
  distinctId: string,
  properties?: Record<string, unknown>,
): void {
  if (typeof window === 'undefined' || !analyticsConfig.posthogKey) return;
  if (!hasAnalyticsConsent()) return;
  posthog.identify(distinctId, properties);
}

export function resetPostHogUser(): void {
  if (typeof window === 'undefined' || !analyticsConfig.posthogKey) return;
  posthog.reset();
}
