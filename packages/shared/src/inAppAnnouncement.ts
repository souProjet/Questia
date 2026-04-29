/** Clé `app_settings` (Prisma) pour le JSON d’annonce in-app. */
export const IN_APP_ANNOUNCEMENT_SETTING_KEY = 'in_app_announcement';

/** Stockage client (localStorage / AsyncStorage) : dernier `id` d’annonce acquittée. */
export const IN_APP_ANNOUNCEMENT_SEEN_STORAGE_KEY = 'questia_in_app_announcement_seen_id';

export type InAppAnnouncementPlatform = 'web' | 'ios' | 'android';

export const IN_APP_ANNOUNCEMENT_PLATFORMS: readonly InAppAnnouncementPlatform[] = [
  'web',
  'ios',
  'android',
];

export type InAppAnnouncementPayload = {
  id: string;
  title: string;
  body: string;
  enabled: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
  /** Vide ou absent = toutes les plateformes. */
  platforms?: InAppAnnouncementPlatform[] | null;
};

function isPlatform(x: unknown): x is InAppAnnouncementPlatform {
  return x === 'web' || x === 'ios' || x === 'android';
}

/**
 * Valide un JSON stocké en base (admin ou migration).
 * Retourne null si invalide.
 */
export function parseInAppAnnouncementPayload(raw: unknown): InAppAnnouncementPayload | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const id = typeof o.id === 'string' ? o.id.trim() : '';
  const title = typeof o.title === 'string' ? o.title.trim() : '';
  const body = typeof o.body === 'string' ? o.body : '';
  const enabled = Boolean(o.enabled);
  if (!id || !title) return null;
  if (body.length > 20000) return null;
  if (title.length > 200) return null;

  let startsAt: string | null | undefined;
  if (o.startsAt === undefined) startsAt = undefined;
  else if (o.startsAt === null) startsAt = null;
  else if (typeof o.startsAt === 'string' && o.startsAt.trim()) {
    const d = Date.parse(o.startsAt);
    if (!Number.isFinite(d)) return null;
    startsAt = new Date(d).toISOString();
  } else return null;

  let endsAt: string | null | undefined;
  if (o.endsAt === undefined) endsAt = undefined;
  else if (o.endsAt === null) endsAt = null;
  else if (typeof o.endsAt === 'string' && o.endsAt.trim()) {
    const d = Date.parse(o.endsAt);
    if (!Number.isFinite(d)) return null;
    endsAt = new Date(d).toISOString();
  } else return null;

  let platforms: InAppAnnouncementPlatform[] | null | undefined;
  if (o.platforms === null || o.platforms === undefined) platforms = o.platforms as undefined;
  else if (Array.isArray(o.platforms)) {
    const pl = o.platforms.filter(isPlatform);
    platforms = pl.length ? pl : null;
  } else return null;

  return {
    id,
    title,
    body,
    enabled,
    startsAt,
    endsAt,
    platforms,
  };
}
