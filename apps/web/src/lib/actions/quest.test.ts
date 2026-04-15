import { describe, expect, it, vi } from 'vitest';
import type { PersonalityVector, QuestLog } from '@questia/shared';
import { TEST_FALLBACK_QUEST_ID, TEST_QUEST_TAXONOMY } from '@questia/shared';

vi.mock('./weather', () => ({
  checkWeatherSafety: vi.fn().mockResolvedValue({
    safe: true,
    temperature: 20,
    alerts: [],
    windSpeed: 0,
    precipitation: 0,
  }),
}));

vi.mock('@/lib/quest-taxonomy/cache', () => ({
  getQuestTaxonomy: vi.fn().mockResolvedValue(TEST_QUEST_TAXONOMY),
  getDefaultFallbackArchetypeId: vi.fn().mockResolvedValue(TEST_FALLBACK_QUEST_ID),
  invalidateQuestTaxonomyCache: vi.fn(),
  setDefaultFallbackArchetypeId: vi.fn(),
}));

import { assignDailyQuest } from './quest';

describe('assignDailyQuest', () => {
  it('assigne une quête avec météo sûre (sans coords)', async () => {
    const declared: PersonalityVector = {
      openness: 0.5,
      conscientiousness: 0.5,
      extraversion: 0.5,
      agreeableness: 0.5,
      emotionalStability: 0.5,
      thrillSeeking: 0.5,
      boredomSusceptibility: 0.5,
    };
    const logs: QuestLog[] = [];
    const r = await assignDailyQuest({
      declaredPersonality: declared,
      questLogs: logs,
      currentDay: 2,
    });
    expect(r.weatherSafe).toBe(true);
    expect(r.wasFallback).toBe(false);
    expect(r.quest).not.toBeNull();
  });
});
