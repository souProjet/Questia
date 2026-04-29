import type {
  InAppAnnouncementPayload,
  InAppAnnouncementPlatform,
} from '@questia/shared';

/**
 * Filtre une annonce stockée selon l’instant et la plateforme (pour GET public).
 */
export function resolveActiveInAppAnnouncement(
  payload: InAppAnnouncementPayload | null,
  now: Date,
  platform: InAppAnnouncementPlatform,
): InAppAnnouncementPayload | null {
  if (!payload || !payload.enabled) return null;

  const pl = payload.platforms;
  if (pl && pl.length > 0 && !pl.includes(platform)) return null;

  if (payload.startsAt) {
    const t = Date.parse(payload.startsAt);
    if (Number.isFinite(t) && now.getTime() < t) return null;
  }
  if (payload.endsAt) {
    const t = Date.parse(payload.endsAt);
    if (Number.isFinite(t) && now.getTime() > t) return null;
  }

  return payload;
}
