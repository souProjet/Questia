/**
 * Consentement cookies « marketing / mesure d'audience » (RGPD).
 * Les scripts tiers (GTM, GA en direct, Meta Pixel) ne sont chargés qu'après opt-in explicite.
 */
export const CONSENT_STORAGE_KEY = 'questia_cookie_consent_v2';

export type MarketingConsent = {
  /** Mesure d'audience (GA4 via GTM ou gtag, etc.) */
  analytics: boolean;
  /** Publicité & remarketing (Meta Pixel, tags pub dans GTM) */
  ads: boolean;
  /** Horodatage ISO */
  updatedAt: string;
};

export function readMarketingConsent(): MarketingConsent | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!raw) return null;
    const j = JSON.parse(raw) as Partial<MarketingConsent>;
    if (typeof j.analytics !== 'boolean' || typeof j.ads !== 'boolean') return null;
    return {
      analytics: j.analytics,
      ads: j.ads,
      updatedAt: typeof j.updatedAt === 'string' ? j.updatedAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function writeMarketingConsent(partial: Partial<Pick<MarketingConsent, 'analytics' | 'ads'>>): MarketingConsent {
  const prev = readMarketingConsent();
  const next: MarketingConsent = {
    analytics: partial.analytics ?? prev?.analytics ?? false,
    ads: partial.ads ?? prev?.ads ?? false,
    updatedAt: new Date().toISOString(),
  };
  try {
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('questia-consent-change', { detail: next }));
  }
  return next;
}

export function hasAnalyticsConsent(): boolean {
  return readMarketingConsent()?.analytics === true;
}

export function hasAdsConsent(): boolean {
  return readMarketingConsent()?.ads === true;
}

export function dispatchConsentRefresh(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('questia-consent-change', { detail: readMarketingConsent() }));
}
