import { describe, expect, it } from 'vitest';
import type { PersonalityVector } from '../types';
import { TEST_QUEST_TAXONOMY } from '../test-fixtures/testTaxonomy';
import { computeAffinityScore } from './affinity';
import { computePhaseFit } from './phaseFit';
import {
  computeArchetypeFeedbackPenalty,
  computeFreshnessScore,
} from './freshness';
import { buildQuestParameters } from './selectCandidates';
import type { ProfileSnapshot, ScoringQuestLog } from './selectionTypes';

const NEUTRAL_VECTOR: PersonalityVector = {
  openness: 0.5,
  conscientiousness: 0.5,
  extraversion: 0.5,
  agreeableness: 0.5,
  emotionalStability: 0.5,
  thrillSeeking: 0.5,
  boredomSusceptibility: 0.5,
};

const HOMEBODY_CAUTIOUS: PersonalityVector = {
  openness: 0.25,
  conscientiousness: 0.7,
  extraversion: 0.2,
  agreeableness: 0.65,
  emotionalStability: 0.4,
  thrillSeeking: 0.15,
  boredomSusceptibility: 0.3,
};

const EXPLORER_RISKTAKER: PersonalityVector = {
  openness: 0.9,
  conscientiousness: 0.4,
  extraversion: 0.85,
  agreeableness: 0.5,
  emotionalStability: 0.7,
  thrillSeeking: 0.9,
  boredomSusceptibility: 0.85,
};

function buildProfile(overrides: Partial<ProfileSnapshot> = {}): ProfileSnapshot {
  return {
    declaredPersonality: NEUTRAL_VECTOR,
    exhibitedPersonality: NEUTRAL_VECTOR,
    congruenceDelta: 0,
    phase: 'expansion',
    day: 7,
    sociability: 'balanced',
    refinementBias: {},
    recentLogs: [],
    hasUserLocation: true,
    isOutdoorFriendly: true,
    instantOnly: false,
    excludeArchetypeIds: [],
    ...overrides,
  };
}

function archetype(id: number) {
  const found = TEST_QUEST_TAXONOMY.find((q) => q.id === id);
  if (!found) throw new Error(`fixture archetype ${id} missing`);
  return found;
}

describe('computeAffinityScore', () => {
  it('rewards explorer profile on spatial_adventure quests', () => {
    const explorer = computeAffinityScore(EXPLORER_RISKTAKER, archetype(1));
    const homebody = computeAffinityScore(HOMEBODY_CAUTIOUS, archetype(1));
    expect(explorer).toBeGreaterThan(homebody + 0.15);
  });

  it('rewards homebody on sensory_deprivation', () => {
    const homebody = computeAffinityScore(HOMEBODY_CAUTIOUS, archetype(3));
    const explorer = computeAffinityScore(EXPLORER_RISKTAKER, archetype(3));
    expect(homebody).toBeGreaterThan(explorer);
  });

  it('blends declared and exhibited when exhibited is provided', () => {
    const score = computeAffinityScore(NEUTRAL_VECTOR, archetype(2), {
      exhibited: HOMEBODY_CAUTIOUS,
      exhibitedWeight: 0.5,
    });
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(1);
  });
});

describe('computePhaseFit', () => {
  it('prefers low/moderate quests in calibration', () => {
    const allTax = TEST_QUEST_TAXONOMY;
    const lowComfort = allTax.find((q) => q.comfortLevel === 'low');
    const extreme = allTax.find((q) => q.comfortLevel === 'extreme');
    if (!lowComfort || !extreme) return;
    const lowFit = computePhaseFit(lowComfort, 'calibration', NEUTRAL_VECTOR);
    const extremeFit = computePhaseFit(extreme, 'calibration', NEUTRAL_VECTOR);
    expect(lowFit).toBeGreaterThan(extremeFit);
  });

  it('prefers high/extreme quests in rupture', () => {
    const allTax = TEST_QUEST_TAXONOMY;
    const lowComfort = allTax.find((q) => q.comfortLevel === 'low');
    const extreme = allTax.find((q) => q.comfortLevel === 'extreme');
    if (!lowComfort || !extreme) return;
    const lowFit = computePhaseFit(lowComfort, 'rupture', NEUTRAL_VECTOR);
    const extremeFit = computePhaseFit(extreme, 'rupture', NEUTRAL_VECTOR);
    expect(extremeFit).toBeGreaterThan(lowFit);
  });

  it('penalises overshoot for gentle profiles', () => {
    const extreme = TEST_QUEST_TAXONOMY.find((q) => q.comfortLevel === 'extreme');
    if (!extreme) return;
    const gentleFit = computePhaseFit(extreme, 'calibration', HOMEBODY_CAUTIOUS);
    const neutralFit = computePhaseFit(extreme, 'calibration', NEUTRAL_VECTOR);
    expect(gentleFit).toBeLessThanOrEqual(neutralFit);
  });
});

describe('computeFreshnessScore', () => {
  const taxonomyById = new Map(TEST_QUEST_TAXONOMY.map((q) => [q.id, q]));

  it('returns 1 when no recent log of the same category', () => {
    const score = computeFreshnessScore(archetype(1), [], taxonomyById);
    expect(score).toBe(1);
  });

  it('does NOT punish a category the user completed', () => {
    const archetype1 = archetype(1);
    const sameCategoryArch = TEST_QUEST_TAXONOMY.find(
      (q) => q.category === archetype1.category && q.id !== archetype1.id,
    );
    if (!sameCategoryArch) return;
    const log: ScoringQuestLog = {
      archetypeId: sameCategoryArch.id,
      status: 'completed',
      questDate: '2025-04-15',
    };
    const score = computeFreshnessScore(archetype1, [log], taxonomyById);
    expect(score).toBe(1);
  });

  it('punishes a category the user rejected', () => {
    const archetype1 = archetype(1);
    const sameCategoryArch = TEST_QUEST_TAXONOMY.find(
      (q) => q.category === archetype1.category && q.id !== archetype1.id,
    );
    if (!sameCategoryArch) return;
    const log: ScoringQuestLog = {
      archetypeId: sameCategoryArch.id,
      status: 'rejected',
      questDate: '2025-04-15',
    };
    const score = computeFreshnessScore(archetype1, [log], taxonomyById);
    expect(score).toBeLessThan(0.5);
  });

  it('decays older rejections more leniently', () => {
    const archetype1 = archetype(1);
    const sameCategoryArch = TEST_QUEST_TAXONOMY.find(
      (q) => q.category === archetype1.category && q.id !== archetype1.id,
    );
    if (!sameCategoryArch) return;
    const recent: ScoringQuestLog = {
      archetypeId: sameCategoryArch.id,
      status: 'rejected',
      questDate: '2025-04-15',
    };
    const olderLogs: ScoringQuestLog[] = Array.from({ length: 6 }, (_, i) => ({
      archetypeId: 999,
      status: 'completed' as const,
      questDate: `2025-04-${String(10 - i).padStart(2, '0')}`,
    }));
    const recentPenalty = computeFreshnessScore(archetype1, [recent], taxonomyById);
    const oldPenalty = computeFreshnessScore(archetype1, [...olderLogs, recent], taxonomyById);
    expect(oldPenalty).toBeGreaterThan(recentPenalty);
  });
});

describe('computeArchetypeFeedbackPenalty', () => {
  it('returns 1 when no rejection history for this archetype', () => {
    expect(computeArchetypeFeedbackPenalty(42, [])).toBe(1);
  });

  it('penalises after explicit rejection of the same archetype', () => {
    const log: ScoringQuestLog = { archetypeId: 42, status: 'rejected', questDate: '2025-04-15' };
    const penalty = computeArchetypeFeedbackPenalty(42, [log]);
    expect(penalty).toBeLessThan(1);
    expect(penalty).toBeGreaterThan(0);
  });

  it('does not penalise a different archetype', () => {
    const log: ScoringQuestLog = { archetypeId: 7, status: 'rejected', questDate: '2025-04-15' };
    expect(computeArchetypeFeedbackPenalty(42, [log])).toBe(1);
  });
});

describe('buildQuestParameters', () => {
  const baseOpts = {
    questDurationMinMinutes: 5,
    questDurationMaxMinutes: 1440,
  };

  it('returns primary category and champion in that category', () => {
    const result = buildQuestParameters(TEST_QUEST_TAXONOMY, buildProfile(), baseOpts);
    expect(result).not.toBeNull();
    const { params } = result!;
    expect(params.primaryChampion.archetype.category).toBe(params.primaryCategory);
    expect(params.themeInspirations.length).toBeGreaterThan(0);
    expect(params.fallbackArchetypePool.every((a) => a.category === params.primaryCategory)).toBe(true);
  });

  it('excludes outdoor archetypes from scoring when location is not available', () => {
    const result = buildQuestParameters(
      TEST_QUEST_TAXONOMY,
      buildProfile({ hasUserLocation: false, isOutdoorFriendly: false }),
      baseOpts,
    );
    expect(result).not.toBeNull();
    for (const c of result!.params.allScored) {
      expect(c.archetype.requiresOutdoor).toBe(false);
    }
  });

  it('heavyQuestPreference low lowers score for travel/planned-heavy archetypes vs balanced', () => {
    const tax = TEST_QUEST_TAXONOMY;
    const seed = 'heavy-pref-test';
    const balanced = buildQuestParameters(tax, buildProfile(), { ...baseOpts, selectionSeed: seed });
    const lowPref = buildQuestParameters(tax, buildProfile({ heavyQuestPreference: 'low' }), {
      ...baseOpts,
      selectionSeed: seed,
    });
    expect(balanced).not.toBeNull();
    expect(lowPref).not.toBeNull();
    const heavyId = 1;
    const lightId = 9;
    const tBalHeavy = balanced!.params.allScored.find((c) => c.archetype.id === heavyId)?.score.total;
    const tLowHeavy = lowPref!.params.allScored.find((c) => c.archetype.id === heavyId)?.score.total;
    const tBalLight = balanced!.params.allScored.find((c) => c.archetype.id === lightId)?.score.total;
    const tLowLight = lowPref!.params.allScored.find((c) => c.archetype.id === lightId)?.score.total;
    expect(tBalHeavy).toBeDefined();
    expect(tLowHeavy).toBeDefined();
    expect(tLowHeavy!).toBeLessThan(tBalHeavy!);
    expect(tLowLight).toBeCloseTo(tBalLight!, 8);
  });

  it('excludes planned archetypes in instantOnly mode', () => {
    const result = buildQuestParameters(
      TEST_QUEST_TAXONOMY,
      buildProfile({ instantOnly: true }),
      baseOpts,
    );
    expect(result).not.toBeNull();
    for (const c of result!.params.allScored) {
      expect(c.archetype.questPace).toBe('instant');
    }
  });

  it('excludes archetypes in excludeArchetypeIds', () => {
    const excludedId = TEST_QUEST_TAXONOMY[0].id;
    const result = buildQuestParameters(
      TEST_QUEST_TAXONOMY,
      buildProfile({ excludeArchetypeIds: [excludedId] }),
      baseOpts,
    );
    expect(result!.params.allScored.find((c) => c.archetype.id === excludedId)).toBeUndefined();
  });

  it('excludes recently served archetypes within window', () => {
    const recentId = TEST_QUEST_TAXONOMY[0].id;
    const result = buildQuestParameters(
      TEST_QUEST_TAXONOMY,
      buildProfile({
        recentLogs: [
          { archetypeId: recentId, status: 'completed', questDate: '2025-04-18' },
        ],
      }),
      { ...baseOpts, todayIso: '2025-04-19', recentExclusionDays: 7 },
    );
    expect(result!.params.allScored.find((c) => c.archetype.id === recentId)).toBeUndefined();
  });

  it('respects refinement bias on primary category', () => {
    const taxWithFamily = TEST_QUEST_TAXONOMY.filter(
      (q) => q.category === 'sensory_deprivation' || q.category === 'spatial_adventure',
    );
    if (taxWithFamily.length < 2) return;
    const result = buildQuestParameters(
      taxWithFamily,
      buildProfile({
        refinementBias: { sensory_deprivation: 0.14 },
      }),
      baseOpts,
    );
    expect(result!.params.primaryCategory).toBe('sensory_deprivation');
  });

  it('produces stable primary category ordering with the same seed', () => {
    const seed = 'user42:2025-04-19';
    const a = buildQuestParameters(TEST_QUEST_TAXONOMY, buildProfile(), { ...baseOpts, selectionSeed: seed });
    const b = buildQuestParameters(TEST_QUEST_TAXONOMY, buildProfile(), { ...baseOpts, selectionSeed: seed });
    expect(a!.params.primaryCategory).toBe(b!.params.primaryCategory);
    expect(a!.params.rankedCategories).toEqual(b!.params.rankedCategories);
  });
});
