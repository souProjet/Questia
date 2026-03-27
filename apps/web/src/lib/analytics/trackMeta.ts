/**
 * Événements Meta Pixel (consentement pub uniquement).
 */
import { analyticsConfig } from '@/config/analytics';
import { hasAdsConsent } from '@/lib/analytics/consent';

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

export function trackMetaPixelEvent(
  eventName: string,
  params?: Record<string, unknown>,
): void {
  if (typeof window === 'undefined') return;
  if (!hasAdsConsent()) return;
  if (!analyticsConfig.metaPixelId) return;
  if (typeof window.fbq !== 'function') return;
  window.fbq('track', eventName, params);
}
