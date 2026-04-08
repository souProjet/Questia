/**
 * Identifiants marketing / analytics — tous optionnels, préfixe NEXT_PUBLIC_ pour le client.
 * Voir `docs/marketing-analytics.md` pour la configuration GTM, GA4, Meta.
 *
 * Chaque variable doit être lue avec `process.env.NEXT_PUBLIC_*` en **nom explicite**.
 * Un accès du type `process.env[key]` n'est pas « inliné » au build par Next.js : les valeurs
 * restent vides dans le bundle client même si Vercel les fournit.
 */
function trimEnv(v: string | undefined): string | undefined {
  const t = v?.trim();
  return t || undefined;
}

export const analyticsConfig = {
  /** Google Tag Manager — ex. GTM-XXXXXXX */
  gtmId: trimEnv(process.env.NEXT_PUBLIC_GTM_ID),
  /** Google Analytics 4 — uniquement si tu branches GA en direct (hors GTM). Ex. G-XXXXXXXXXX */
  gaMeasurementId: trimEnv(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID),
  /** Meta (Facebook) Pixel — identifiant numérique */
  metaPixelId: trimEnv(process.env.NEXT_PUBLIC_META_PIXEL_ID),
  /** PostHog — clé projet (phc_…). EU : utiliser NEXT_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com */
  posthogKey: trimEnv(process.env.NEXT_PUBLIC_POSTHOG_KEY),
  /** Hôte API PostHog (défaut EU cloud) */
  posthogHost: trimEnv(process.env.NEXT_PUBLIC_POSTHOG_HOST) ?? 'https://eu.i.posthog.com',
  /** UI PostHog (toolbar) — optionnel, ex. https://eu.posthog.com */
  posthogUiHost: trimEnv(process.env.NEXT_PUBLIC_POSTHOG_UI_HOST),
} as const;

export function isAnalyticsConfigured(): boolean {
  return Boolean(
    analyticsConfig.gtmId ||
      analyticsConfig.gaMeasurementId ||
      analyticsConfig.metaPixelId ||
      analyticsConfig.posthogKey,
  );
}
