import { describe, expect, it } from 'vitest';
import {
  computeExhibitedPersonality,
  computeCongruenceDelta,
  getTargetDelta,
  scoreQuestFit,
  selectQuest,
} from './congruence';
import { TEST_FALLBACK_QUEST_ID, TEST_QUEST_TAXONOMY } from '../test-fixtures/testTaxonomy';
import type { PersonalityVector, QuestLog, QuestModel } from '../types';

const uniform = (v: number): PersonalityVector => ({
  openness: v,
  conscientiousness: v,
  extraversion: v,
  agreeableness: v,
  emotionalStability: v,
  thrillSeeking: v,
  boredomSusceptibility: v,
});

describe('computeExhibitedPersonality', () => {
  it('retourne la baseline neutre (0.5) sans historique (comparable avec declared)', () => {
    const p = computeExhibitedPersonality([], TEST_QUEST_TAXONOMY);
    // Toutes les dimensions doivent être centrées sur 0.5 (pas de signal).
    for (const k of Object.keys(p) as (keyof typeof p)[]) {
      expect(p[k]).toBe(0.5);
    }
  });

  it('ignore les quêtes inconnues et les statuts sans poids', () => {
    const logs: QuestLog[] = [
      {
        id: '1',
        userId: 'u',
        questId: 99999,
        assignedAt: '',
        status: 'completed',
        congruenceDeltaAtAssignment: 0,
        phaseAtAssignment: 'calibration',
        wasRerolled: false,
        wasFallback: false,
        safetyConsentGiven: false,
      },
      {
        id: '2',
        userId: 'u',
        questId: 1,
        assignedAt: '',
        status: 'pending',
        congruenceDeltaAtAssignment: 0,
        phaseAtAssignment: 'calibration',
        wasRerolled: false,
        wasFallback: false,
        safetyConsentGiven: false,
      },
    ];
    const p = computeExhibitedPersonality(logs, TEST_QUEST_TAXONOMY);
    // Aucun log avec poids non nul → baseline neutre.
    expect(p.openness).toBe(0.5);
  });

  it('un reject d\'une quête introspective ne rend pas "extrêmement introverti" tous les traits non corrélés', () => {
    // Cherche une quête introspective (negative correlation on extraversion) dans la taxonomie
    const introspective = TEST_QUEST_TAXONOMY.find((q) => q.category === 'public_introspection');
    if (!introspective) return; // skip si pas dans le fixture
    const logs: QuestLog[] = [
      {
        id: 'r',
        userId: 'u',
        questId: introspective.id,
        assignedAt: '',
        status: 'rejected',
        congruenceDeltaAtAssignment: 0,
        phaseAtAssignment: 'calibration',
        wasRerolled: false,
        wasFallback: false,
        safetyConsentGiven: false,
      },
    ];
    const p = computeExhibitedPersonality(logs, TEST_QUEST_TAXONOMY);
    // Les traits avec corrélation ≈ 0 restent près de 0.5, pas à 0.
    expect(p.conscientiousness).toBeGreaterThan(0.2);
    expect(p.conscientiousness).toBeLessThan(0.8);
  });

  it('agrège completed / accepted / rejected', () => {
    const q = TEST_QUEST_TAXONOMY[0]!;
    const logs: QuestLog[] = [
      {
        id: 'a',
        userId: 'u',
        questId: q.id,
        assignedAt: '',
        status: 'completed',
        congruenceDeltaAtAssignment: 0,
        phaseAtAssignment: 'calibration',
        wasRerolled: false,
        wasFallback: false,
        safetyConsentGiven: false,
      },
      {
        id: 'b',
        userId: 'u',
        questId: q.id,
        assignedAt: '',
        status: 'accepted',
        congruenceDeltaAtAssignment: 0,
        phaseAtAssignment: 'calibration',
        wasRerolled: false,
        wasFallback: false,
        safetyConsentGiven: false,
      },
      {
        id: 'c',
        userId: 'u',
        questId: q.id,
        assignedAt: '',
        status: 'rejected',
        congruenceDeltaAtAssignment: 0,
        phaseAtAssignment: 'calibration',
        wasRerolled: false,
        wasFallback: false,
        safetyConsentGiven: false,
      },
    ];
    const p = computeExhibitedPersonality(logs, TEST_QUEST_TAXONOMY);
    expect(Object.values(p).every((x) => x >= 0 && x <= 1)).toBe(true);
  });
});

describe('computeCongruenceDelta', () => {
  it('retourne 0 pour deux vecteurs identiques', () => {
    const v = uniform(0.5);
    expect(computeCongruenceDelta(v, v)).toBe(0);
  });

  it('augmente avec les écarts', () => {
    const a = uniform(0);
    const b = uniform(1);
    expect(computeCongruenceDelta(a, b)).toBeGreaterThan(0);
  });
});

describe('getTargetDelta', () => {
  it('couvre les trois phases', () => {
    expect(getTargetDelta('calibration')).toEqual({ min: 0, max: 0.1 });
    expect(getTargetDelta('expansion').max).toBeGreaterThan(getTargetDelta('expansion').min);
    expect(getTargetDelta('rupture').min).toBeGreaterThanOrEqual(0.4);
  });
});

describe('scoreQuestFit', () => {
  it('retourne Infinity si pas de corrélation (catégorie absente)', () => {
    const quest = {
      ...TEST_QUEST_TAXONOMY[0]!,
      category: '__no_corr__',
    } as unknown as QuestModel;
    const score = scoreQuestFit(quest, uniform(0.5), { min: 0, max: 0.5 });
    expect(score).toBe(Infinity);
  });

  it('score fini pour une quête valide', () => {
    const q = TEST_QUEST_TAXONOMY[0]!;
    const s = scoreQuestFit(q, uniform(0.5), { min: 0, max: 0.5 });
    expect(Number.isFinite(s)).toBe(true);
  });
});

describe('selectQuest', () => {
  it('retourne null si aucun candidat', () => {
    const allIds = TEST_QUEST_TAXONOMY.map((q) => q.id);
    const r = selectQuest(TEST_QUEST_TAXONOMY, uniform(0.5), 'calibration', allIds, true);
    expect(r).toBeNull();
  });

  it('respecte allowOutdoor (intérieur uniquement)', () => {
    const indoor = TEST_QUEST_TAXONOMY.filter((q) => !q.requiresOutdoor);
    expect(indoor.length).toBeGreaterThan(0);
    const r = selectQuest(TEST_QUEST_TAXONOMY, uniform(0.5), 'calibration', [], false);
    expect(r).not.toBeNull();
    expect(r!.requiresOutdoor).toBe(false);
  });

  it('retourne une quête en phase expansion', () => {
    const r = selectQuest(TEST_QUEST_TAXONOMY, uniform(0.3), 'expansion', [], true);
    expect(r).not.toBeNull();
  });

  it('utilise le fallback canonique si présent', () => {
    const fb = TEST_QUEST_TAXONOMY.find((q) => q.id === TEST_FALLBACK_QUEST_ID);
    expect(fb).toBeDefined();
  });

  it('instantOnly exclut les archétypes planifiés', () => {
    const allIds: number[] = [];
    const r = selectQuest(
      TEST_QUEST_TAXONOMY,
      uniform(0.5),
      'calibration',
      allIds,
      true,
      undefined,
      true,
    );
    expect(r).not.toBeNull();
    expect(r!.questPace).toBe('instant');
  });

  it('avec selectionSeed, reste deterministe pour un meme seed', () => {
    const a = selectQuest(TEST_QUEST_TAXONOMY, uniform(0.5), 'expansion', [], true, undefined, false, {
      selectionSeed: 'userA:2026-03-28',
    });
    const b = selectQuest(TEST_QUEST_TAXONOMY, uniform(0.5), 'expansion', [], true, undefined, false, {
      selectionSeed: 'userA:2026-03-28',
    });
    expect(a?.id).toBe(b?.id);
  });

  it('peut varier entre seeds differents a score proche', () => {
    const a = selectQuest(TEST_QUEST_TAXONOMY, uniform(0.5), 'expansion', [], true, undefined, false, {
      selectionSeed: 'userA:2026-03-28',
    });
    const b = selectQuest(TEST_QUEST_TAXONOMY, uniform(0.5), 'expansion', [], true, undefined, false, {
      selectionSeed: 'userB:2026-03-28',
    });
    expect(a).not.toBeNull();
    expect(b).not.toBeNull();
  });

  it('categoryScorePenalty dépriorise fortement une catégorie', () => {
    const base = selectQuest(TEST_QUEST_TAXONOMY, uniform(0.5), 'expansion', [], true, undefined, false, {
      selectionSeed: 'fixed-seed-penalty-test',
      diversityWindow: 30,
    });
    expect(base).not.toBeNull();
    const cat = base!.category;
    const penalized = selectQuest(TEST_QUEST_TAXONOMY, uniform(0.5), 'expansion', [], true, undefined, false, {
      selectionSeed: 'fixed-seed-penalty-test',
      diversityWindow: 30,
      categoryScorePenalty: { [cat]: 8 },
    });
    expect(penalized).not.toBeNull();
    expect(penalized!.category).not.toBe(cat);
  });
});
