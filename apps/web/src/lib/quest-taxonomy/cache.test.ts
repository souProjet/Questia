import { describe, expect, it, beforeEach, vi } from 'vitest';
import type { QuestArchetype } from '@prisma/client';

const prisma = vi.hoisted(() => ({
  questArchetype: {
    findMany: vi.fn(),
  },
  appSetting: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
  },
}));

vi.mock('@/lib/db', () => ({ prisma }));

import {
  getQuestTaxonomy,
  invalidateQuestTaxonomyCache,
  getDefaultFallbackArchetypeId,
  setDefaultFallbackArchetypeId,
} from './cache';

const baseRow = {
  id: 1,
  title: 'T',
  description: 'D',
  titleEn: 'TE',
  descriptionEn: 'DE',
  category: 'exploratory_sociability',
  targetTraits: { openness: 0.5 },
  comfortLevel: 'moderate',
  requiresOutdoor: false,
  requiresSocial: false,
  minimumDurationMinutes: 45,
  fallbackQuestId: null,
  questPace: 'instant',
  published: true,
  createdAt: new Date(),
  updatedAt: new Date(),
} satisfies Partial<QuestArchetype>;

beforeEach(() => {
  invalidateQuestTaxonomyCache();
  prisma.questArchetype.findMany.mockReset();
  prisma.appSetting.findUnique.mockReset();
  prisma.appSetting.upsert.mockReset();
  prisma.questArchetype.findMany.mockResolvedValue([baseRow as QuestArchetype]);
});

describe('getQuestTaxonomy', () => {
  it('charge la taxonomie publiée et met en cache', async () => {
    const a = await getQuestTaxonomy();
    const b = await getQuestTaxonomy();
    expect(prisma.questArchetype.findMany).toHaveBeenCalledTimes(1);
    expect(a.length).toBe(1);
    expect(b).toEqual(a);
    expect(prisma.questArchetype.findMany).toHaveBeenCalledWith({
      where: { published: true },
      orderBy: { id: 'asc' },
    });
  });

  it('skipCache force un nouveau fetch', async () => {
    await getQuestTaxonomy();
    await getQuestTaxonomy({ skipCache: true });
    expect(prisma.questArchetype.findMany).toHaveBeenCalledTimes(2);
  });

  it('includeUnpublished utilise un cache distinct', async () => {
    await getQuestTaxonomy();
    await getQuestTaxonomy({ includeUnpublished: true });
    expect(prisma.questArchetype.findMany).toHaveBeenCalledTimes(2);
    expect(prisma.questArchetype.findMany).toHaveBeenLastCalledWith({
      where: {},
      orderBy: { id: 'asc' },
    });
  });

  it('après expiration du TTL, recharge depuis la base', async () => {
    vi.useFakeTimers();
    invalidateQuestTaxonomyCache();
    await getQuestTaxonomy();
    expect(prisma.questArchetype.findMany).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(46_000);
    await getQuestTaxonomy();
    expect(prisma.questArchetype.findMany).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });
});

describe('getDefaultFallbackArchetypeId', () => {
  it('retourne la valeur AppSetting si valide', async () => {
    prisma.appSetting.findUnique.mockResolvedValue({ key: 'default_fallback_archetype_id', value: ' 12 ' });
    await expect(getDefaultFallbackArchetypeId()).resolves.toBe(12);
  });

  it('retourne 9 si valeur absente ou invalide', async () => {
    prisma.appSetting.findUnique.mockResolvedValue(null);
    await expect(getDefaultFallbackArchetypeId()).resolves.toBe(9);
    prisma.appSetting.findUnique.mockResolvedValue({ key: 'k', value: 'abc' });
    await expect(getDefaultFallbackArchetypeId()).resolves.toBe(9);
  });
});

describe('setDefaultFallbackArchetypeId', () => {
  it('upsert la clé et invalide le cache taxonomie', async () => {
    prisma.appSetting.upsert.mockResolvedValue(undefined);
    await getQuestTaxonomy();
    expect(prisma.questArchetype.findMany).toHaveBeenCalledTimes(1);
    await setDefaultFallbackArchetypeId(42);
    expect(prisma.appSetting.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { key: 'default_fallback_archetype_id' },
        create: { key: 'default_fallback_archetype_id', value: '42' },
        update: { value: '42' },
      }),
    );
    await getQuestTaxonomy();
    expect(prisma.questArchetype.findMany).toHaveBeenCalledTimes(2);
  });
});
