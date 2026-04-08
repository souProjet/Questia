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

/** ID d’app Meta (`fb:app_id` dans le `<head>`) — optionnel ; https://developers.facebook.com/apps */
export const facebookAppId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID?.trim() ?? '';
