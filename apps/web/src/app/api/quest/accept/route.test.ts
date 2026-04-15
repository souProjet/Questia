import { describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { TEST_FALLBACK_QUEST_ID, TEST_QUEST_TAXONOMY } from '@questia/shared';

vi.mock('@/lib/quest-taxonomy/cache', () => ({
  getQuestTaxonomy: vi.fn().mockResolvedValue(TEST_QUEST_TAXONOMY),
  getDefaultFallbackArchetypeId: vi.fn().mockResolvedValue(TEST_FALLBACK_QUEST_ID),
  invalidateQuestTaxonomyCache: vi.fn(),
  setDefaultFallbackArchetypeId: vi.fn(),
}));

vi.mock('@/lib/actions/ai', () => ({
  generateQuestNarration: vi.fn().mockResolvedValue({
    title: 'T',
    narrative: 'N',
    motivationalHook: 'H',
    estimatedDuration: '1h',
    safetyReminders: [],
  }),
}));

vi.mock('@/lib/actions/weather', () => ({
  checkWeatherSafety: vi.fn().mockResolvedValue({
    safe: true,
    temperature: 20,
    alerts: [],
    windSpeed: 0,
    precipitation: 0,
  }),
}));

import { POST } from './route';

describe('POST /api/quest/accept', () => {
  it('404 quête inconnue', async () => {
    const body = {
      questId: 999999,
      quadrant: { explorerAxis: 'explorer' as const, riskAxis: 'cautious' as const },
      phase: 'calibration' as const,
      congruenceDelta: 0,
      currentDay: 1,
    };
    const req = new NextRequest('http://localhost/api/quest/accept', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    const res = await POST(req);
    expect(res.status).toBe(404);
  });

  it('200 narration pour quête valide', async () => {
    const body = {
      questId: 1,
      quadrant: { explorerAxis: 'explorer' as const, riskAxis: 'cautious' as const },
      phase: 'calibration' as const,
      congruenceDelta: 0.1,
      currentDay: 1,
    };
    const req = new NextRequest('http://localhost/api/quest/accept', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.narration).toBeDefined();
    expect(json.questId).toBe(1);
  });
});
