/**
 * URLs publiques (stores, site) — définir dans .env pour la prod.
 * NEXT_PUBLIC_* est exposé au client.
 */
export const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ?? 'https://questia.fr';

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
