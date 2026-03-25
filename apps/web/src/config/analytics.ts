/**
 * Identifiants marketing / analytics — tous optionnels, préfixe NEXT_PUBLIC_ pour le client.
 * Voir `docs/marketing-analytics.md` pour la configuration GTM, GA4, Meta.
 */

function env(key: string): string | undefined {
  const v = process.env[key]?.trim();
  return v || undefined;
}

export const analyticsConfig = {
  /** Google Tag Manager — ex. GTM-XXXXXXX */
  gtmId: env('NEXT_PUBLIC_GTM_ID'),
  /** Google Analytics 4 — uniquement si tu branches GA en direct (hors GTM). Ex. G-XXXXXXXXXX */
  gaMeasurementId: env('NEXT_PUBLIC_GA_MEASUREMENT_ID'),
  /** Meta (Facebook) Pixel — identifiant numérique */
  metaPixelId: env('NEXT_PUBLIC_META_PIXEL_ID'),
} as const;

export function isAnalyticsConfigured(): boolean {
  return Boolean(
    analyticsConfig.gtmId || analyticsConfig.gaMeasurementId || analyticsConfig.metaPixelId,
  );
}
