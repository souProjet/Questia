import { describe, expect, it } from 'vitest';
import type { QuestModel } from '../types';
import type { ScoringQuestLog } from './selectionTypes';
import {
  computeArchetypeFeedbackPenalty,
  computeFreshnessScore,
  listSaturatedCategories,
} from './freshness';

function tinyTaxonomy(): Map<number, QuestModel> {
  const base: QuestModel = {
    id: 1,
    title: 'A',
    titleEn: 'A',
    description: '',
    descriptionEn: '',
    targetTraits: {},
    category: 'spatial_adventure',
    comfortLevel: 'moderate',
    minimumDurationMinutes: 15,
    requiresOutdoor: false,
    requiresSocial: false,
    questPace: 'instant',
  };
  const b: QuestModel = { ...base, id: 2, category: 'public_introspection' };
  return new Map([
    [1, base],
    [2, b],
  ]);
}

describe('freshness', () => {
  const tax = tinyTaxonomy();
  const arch = tax.get(1)!;

  it('computeFreshnessScore ignore archétype inconnu dans les logs', () => {
    const logs: ScoringQuestLog[] = [{ archetypeId: 99, status: 'rejected', questDate: '2026-01-01' }];
    const s = computeFreshnessScore(arch, logs, tax);
    expect(s).toBeGreaterThan(0.9);
  });

  it('computeFreshnessScore pénalise même catégorie', () => {
    const logs: ScoringQuestLog[] = [{ archetypeId: 1, status: 'rejected', questDate: '2026-01-01' }];
    const s = computeFreshnessScore(arch, logs, tax);
    expect(s).toBeLessThan(0.5);
  });

  it('computeArchetypeFeedbackPenalty : rejet puis completed', () => {
    const logs: ScoringQuestLog[] = [
      { archetypeId: 5, status: 'rejected', questDate: null },
      { archetypeId: 5, status: 'completed', questDate: null },
    ];
    const p = computeArchetypeFeedbackPenalty(5, logs);
    expect(p).toBeGreaterThanOrEqual(0);
    expect(p).toBeLessThanOrEqual(1);
  });

  it('listSaturatedCategories avec seuil', () => {
    const logs: ScoringQuestLog[] = [
      { archetypeId: 1, status: 'rejected', questDate: null },
      { archetypeId: 1, status: 'rejected', questDate: null },
    ];
    const sat = listSaturatedCategories(logs, tax, 1.2);
    expect(sat).toContain('spatial_adventure');
  });

  it('listSaturatedCategories ignore id inconnu', () => {
    const logs: ScoringQuestLog[] = [{ archetypeId: 999, status: 'completed', questDate: null }];
    expect(listSaturatedCategories(logs, tax)).toEqual([]);
  });
});
