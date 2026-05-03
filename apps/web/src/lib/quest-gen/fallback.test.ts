import { describe, expect, it } from 'vitest';
import type { QuestCandidate, QuestModel } from '@questia/shared';
import { TEST_QUEST_TAXONOMY } from '@questia/shared';
import { buildFallbackQuest } from './fallback';

function candidateFromArchetype(archetype: QuestModel): QuestCandidate {
  return {
    archetype,
    score: {
      affinity: 1,
      phaseFit: 1,
      freshness: 1,
      refinement: 0.5,
      total: 1,
    },
    reason: 'test',
  };
}

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
      const q = buildFallbackQuest(candidateFromArchetype(archetype), 'fr', baseCtx);
      expect(q.icon).toBeTruthy();
      expect(q.wasFallback).toBe(true);
      expect(q.title.length).toBeGreaterThan(0);
    }
    expect(seen.size).toBeGreaterThanOrEqual(8);
  });

  it('locale en : hook et consignes extérieur', () => {
    const outdoor = TEST_QUEST_TAXONOMY.find((a) => a.requiresOutdoor) ?? TEST_QUEST_TAXONOMY[0]!;
    const q = buildFallbackQuest(candidateFromArchetype(outdoor), 'en', baseCtx);
    if (outdoor.requiresOutdoor) {
      expect(q.isOutdoor).toBe(true);
      expect(q.safetyNote).toMatch(/public/i);
    }
  });

  it('sans conditions extérieur : isOutdoor false et pas de consigne', () => {
    const outdoorArch = TEST_QUEST_TAXONOMY.find((a) => a.requiresOutdoor) ?? TEST_QUEST_TAXONOMY[0]!;
    const q = buildFallbackQuest(candidateFromArchetype(outdoorArch), 'fr', {
      ...baseCtx,
      hasUserLocation: false,
    });
    expect(q.isOutdoor).toBe(false);
    expect(q.safetyNote).toBeNull();
  });

  it('catégorie inconnue → icône Target par défaut', () => {
    const weird = {
      ...TEST_QUEST_TAXONOMY[0]!,
      category: 'not-a-real-category' as QuestModel['category'],
    };
    const q = buildFallbackQuest(candidateFromArchetype(weird), 'fr', baseCtx);
    expect(q.icon).toBe('Target');
  });
});
