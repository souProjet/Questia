import { prisma } from '@/lib/db';
import type { QuestModel } from '@questia/shared';
import { prismaArchetypeToQuestModel } from './map-prisma';

const TTL_MS = 45_000;
let cache: { rows: QuestModel[]; loadedAt: number; includeUnpublished: boolean } | null = null;

export async function getQuestTaxonomy(options?: {
  skipCache?: boolean;
  /** Admin : inclure les brouillons. */
  includeUnpublished?: boolean;
}): Promise<QuestModel[]> {
  const includeUnpublished = options?.includeUnpublished === true;
  if (
    !options?.skipCache &&
    cache &&
    Date.now() - cache.loadedAt < TTL_MS &&
    cache.includeUnpublished === includeUnpublished
  ) {
    return cache.rows;
  }

  const rows = await prisma.questArchetype.findMany({
    where: includeUnpublished ? {} : { published: true },
    orderBy: { id: 'asc' },
  });

  const mapped = rows.map(prismaArchetypeToQuestModel);
  cache = { rows: mapped, loadedAt: Date.now(), includeUnpublished };
  return mapped;
}

export function invalidateQuestTaxonomyCache(): void {
  cache = null;
}

const FALLBACK_SETTING_KEY = 'default_fallback_archetype_id';

export async function getDefaultFallbackArchetypeId(): Promise<number> {
  const row = await prisma.appSetting.findUnique({ where: { key: FALLBACK_SETTING_KEY } });
  const n = row?.value ? parseInt(row.value.trim(), 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : 9;
}

export async function setDefaultFallbackArchetypeId(id: number): Promise<void> {
  await prisma.appSetting.upsert({
    where: { key: FALLBACK_SETTING_KEY },
    create: { key: FALLBACK_SETTING_KEY, value: String(id) },
    update: { value: String(id) },
  });
  invalidateQuestTaxonomyCache();
}
