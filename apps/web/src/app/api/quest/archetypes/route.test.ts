import { describe, expect, it, vi } from 'vitest';
import { TEST_QUEST_TAXONOMY } from '@questia/shared';

vi.mock('@/lib/quest-taxonomy/cache', () => ({
  getQuestTaxonomy: vi.fn().mockResolvedValue(TEST_QUEST_TAXONOMY),
  invalidateQuestTaxonomyCache: vi.fn(),
  getDefaultFallbackArchetypeId: vi.fn(),
  setDefaultFallbackArchetypeId: vi.fn(),
}));

import { getQuestTaxonomy } from '@/lib/quest-taxonomy/cache';
import { GET } from './route';

describe('GET /api/quest/archetypes', () => {
  it('renvoie la taxonomie JSON', async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body).toEqual(TEST_QUEST_TAXONOMY);
    expect(getQuestTaxonomy).toHaveBeenCalledWith();
  });
});
