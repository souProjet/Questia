import type { AppLocale } from '@questia/shared';
import { levelFromTotalXp, displayEarnedBadges, type DisplayBadge } from '@questia/shared';

export type SerializedBadge = DisplayBadge;

export function parseBadgesEarned(raw: unknown): { id: string; unlockedAt: string }[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (x): x is { id: string; unlockedAt: string } =>
        x != null &&
        typeof x === 'object' &&
        typeof (x as { id?: string }).id === 'string' &&
        typeof (x as { unlockedAt?: string }).unlockedAt === 'string',
    )
    .map((b) => ({ id: b.id, unlockedAt: b.unlockedAt }));
}

export function serializeBadges(raw: unknown, locale: AppLocale = 'fr'): SerializedBadge[] {
  return displayEarnedBadges(raw, locale);
}

export function progressionFields(totalXp: number) {
  const safe = Math.max(0, Math.floor(totalXp));
  return { totalXp: safe, ...levelFromTotalXp(safe) };
}

export function badgeIdsSet(raw: unknown): Set<string> {
  return new Set(parseBadgesEarned(raw).map((b) => b.id));
}
