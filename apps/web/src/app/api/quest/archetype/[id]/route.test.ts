import { describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { TEST_QUEST_TAXONOMY } from '@questia/shared';

vi.mock('@/lib/quest-taxonomy/cache', () => ({
  getQuestTaxonomy: vi.fn().mockResolvedValue(TEST_QUEST_TAXONOMY),
  invalidateQuestTaxonomyCache: vi.fn(),
  getDefaultFallbackArchetypeId: vi.fn(),
  setDefaultFallbackArchetypeId: vi.fn(),
}));

import { GET } from './route';

describe('GET /api/quest/archetype/[id]', () => {
  it('400 si id non numérique', async () => {
    const res = await GET(new NextRequest('http://localhost'), {
      params: Promise.resolve({ id: 'abc' }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('ID invalide');
  });

  it('404 si archétype absent', async () => {
    const res = await GET(new NextRequest('http://localhost'), {
      params: Promise.resolve({ id: '999999' }),
    });
    expect(res.status).toBe(404);
  });

  it('200 avec l’archétype', async () => {
    const expected = TEST_QUEST_TAXONOMY.find((q) => q.id === 1)!;
    const res = await GET(new NextRequest('http://localhost'), {
      params: Promise.resolve({ id: '1' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(1);
    expect(body.title).toBe(expected.title);
  });
});
