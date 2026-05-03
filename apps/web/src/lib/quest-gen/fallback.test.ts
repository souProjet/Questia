import { describe, expect, it } from 'vitest';
import type { QuestModel } from '@questia/shared';
import { TEST_QUEST_TAXONOMY } from '@questia/shared';
import { buildFallbackQuest } from './fallback';

describe('buildFallbackQuest', () => {
  const baseCtx = {
    questDateIso: '2026-05-01',
    hasUserLocation: true,
    isOutdoorFriendly: true,
  };

  it('couvre chaque catégorie psychologique (icône + texte)', () => {
    const seen = new Set<string>();
    for (const archetype of TEST_QUEST_TAXONOMY) {
      seen.add(archetype.category);
      const pool = TEST_QUEST_TAXONOMY.filter((a) => a.category === archetype.category);
      const q = buildFallbackQuest(pool, TEST_QUEST_TAXONOMY, archetype.category, 'fr', baseCtx, 'test');
      expect(q.icon).toBeTruthy();
      expect(q.wasFallback).toBe(true);
      expect(q.psychologicalCategory).toBe(archetype.category);
      expect(q.title.length).toBeGreaterThan(0);
    }
    expect(seen.size).toBeGreaterThanOrEqual(8);
  });

  it('locale en : hook et consignes extérieur', () => {
    const outdoor = TEST_QUEST_TAXONOMY.find((a) => a.requiresOutdoor) ?? TEST_QUEST_TAXONOMY[0]!;
    const pool = TEST_QUEST_TAXONOMY.filter((a) => a.category === outdoor.category);
    const q = buildFallbackQuest(pool, TEST_QUEST_TAXONOMY, outdoor.category, 'en', baseCtx, 'en');
    if (outdoor.requiresOutdoor) {
      expect(q.isOutdoor).toBe(true);
      expect(q.safetyNote).toMatch(/public/i);
    }
  });

  it('sans conditions extérieur : isOutdoor false et pas de consigne', () => {
    const outdoorArch = TEST_QUEST_TAXONOMY.find((a) => a.requiresOutdoor) ?? TEST_QUEST_TAXONOMY[0]!;
    const pool = TEST_QUEST_TAXONOMY.filter((a) => a.category === outdoorArch.category);
    const q = buildFallbackQuest(pool, TEST_QUEST_TAXONOMY, outdoorArch.category, 'fr', {
      ...baseCtx,
      hasUserLocation: false,
    }, 'x');
    expect(q.isOutdoor).toBe(false);
    expect(q.safetyNote).toBeNull();
  });

  it('icône Target par défaut pour catégorie hors switch', () => {
    const weird = {
      ...TEST_QUEST_TAXONOMY[0]!,
      category: 'not-a-real' as QuestModel['category'],
    };
    const q = buildFallbackQuest([weird], [weird], weird.category, 'fr', baseCtx, 'weird');
    expect(q.icon).toBe('Target');
  });
});
