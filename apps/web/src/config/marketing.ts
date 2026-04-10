/**
 * URLs publiques (stores, site) — définir dans .env pour la prod.
 * NEXT_PUBLIC_* est exposé au client.
 *
 * Une chaîne vide ou une URL invalide ferait échouer `new URL(siteUrl)` (metadata, sitemap) → 500.
 */
const SITE_FALLBACK = 'https://questia.fr';

function readSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '')?.trim();
  if (!raw) return SITE_FALLBACK;
  try {
    new URL(raw);
    return raw;
  } catch {
    return SITE_FALLBACK;
  }
}

export const siteUrl = readSiteUrl();

export const appStoreUrl = process.env.NEXT_PUBLIC_APP_STORE_URL?.trim() ?? '';
export const playStoreUrl = process.env.NEXT_PUBLIC_PLAY_STORE_URL?.trim() ?? '';

export function hasAppStoreLink(): boolean {
  return appStoreUrl.length > 0;
}

export function hasPlayStoreLink(): boolean {
  return playStoreUrl.length > 0;
}

export function hasAnyStoreLink(): boolean {
  return hasAppStoreLink() || hasPlayStoreLink();
}

/** Pour copy SEO / landing : quels stores sont réellement configurés. */
export type StoreAvailability = 'none' | 'android' | 'ios' | 'both';

export function storeAvailability(): StoreAvailability {
  const ios = hasAppStoreLink();
  const android = hasPlayStoreLink();
  if (ios && android) return 'both';
  if (android) return 'android';
  if (ios) return 'ios';
  return 'none';
}

/** Valeur `operatingSystem` (schema.org) — libellés usuels en anglais. */
export function softwareApplicationOperatingSystemLabel(): string {
  switch (storeAvailability()) {
    case 'android':
      return 'Android, Web';
    case 'ios':
      return 'iOS, Web';
    case 'both':
      return 'iOS, Android, Web';
    default:
      return 'Web';
  }
}

/** Manifest PWA (une seule locale côté Next) — FR, aligné sur la dispo réelle des stores. */
export function pwaManifestDescriptionFr(): string {
  switch (storeAvailability()) {
    case 'android':
      return 'Questia : une quête IRL par jour — motivation et défis adaptés à ton profil. Android et web.';
    case 'ios':
      return 'Questia : une quête IRL par jour — motivation et défis adaptés à ton profil. iOS et web.';
    case 'both':
      return 'Questia : une quête IRL par jour — motivation et défis adaptés à ton profil. Web, iOS et Android.';
    default:
      return 'Questia : une quête IRL par jour — motivation et défis adaptés à ton profil. Sur le web.';
  }
}

/** ID d'app Meta (`fb:app_id` dans le `<head>`) — optionnel ; https://developers.facebook.com/apps */
export const facebookAppId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID?.trim() ?? '';
