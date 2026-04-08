import type { Prisma } from '@prisma/client';
import type { ShopCatalogEntry } from '@questia/shared';
import { getThemeIds } from '@questia/shared';
import { prisma } from '@/lib/db';
import { parseStringArray } from './parse';

type Db = Prisma.TransactionClient | typeof prisma;

function mergeUnique(a: string[], b: string[]): string[] {
  return [...new Set([...a, ...b])];
}

/**
 * Applique les droits d'un ou plusieurs articles au profil (idempotent par SKU côté webhook).
 */
export async function applyGrantsToProfile(
  profileId: string,
  entries: ShopCatalogEntry[],
  db: Db = prisma,
): Promise<void> {
  const profile = await db.profile.findUnique({ where: { id: profileId } });
  if (!profile) return;

  let themes = parseStringArray(profile.ownedThemes);
  if (!themes.includes('default')) themes = mergeUnique(['default'], themes);

  let bonusRerollCredits = profile.bonusRerollCredits ?? 0;
  let titles = parseStringArray((profile as { ownedTitleIds?: unknown }).ownedTitleIds);
  let xpBonusCharges = (profile as { xpBonusCharges?: number | null }).xpBonusCharges ?? 0;

  for (const entry of entries) {
    const g = entry.grants;
    if (g.themes?.length) {
      themes = mergeUnique(themes, g.themes);
    }
    if (g.bonusRerolls && g.bonusRerolls > 0) {
      bonusRerollCredits += g.bonusRerolls;
    }
    if (g.titles?.length) {
      titles = mergeUnique(titles, g.titles);
    }
    if (g.xpBonusCharges && g.xpBonusCharges > 0) {
      xpBonusCharges += g.xpBonusCharges;
    }
  }

  const allowed = new Set(getThemeIds());
  let activeThemeId = profile.activeThemeId;
  if (!allowed.has(activeThemeId)) activeThemeId = 'default';

  const data = {
    ownedThemes: themes as unknown as Prisma.InputJsonValue,
    bonusRerollCredits,
    ownedTitleIds: titles as unknown as Prisma.InputJsonValue,
    xpBonusCharges,
  };

  const ownedSet = new Set(themes);
  const payload: Record<string, unknown> = { ...data };
  if (!ownedSet.has(activeThemeId)) {
    payload.activeThemeId = 'default';
  }

  await db.profile.update({
    where: { id: profileId },
    data: payload as unknown as Prisma.ProfileUpdateInput,
  });
}
