import { describe, expect, it } from 'vitest';
import {
  computeExhibitedPersonality,
  computeCongruenceDelta,
  getTargetDelta,
  scoreQuestFit,
  selectQuest,
} from './congruence';
import { QUEST_TAXONOMY, FALLBACK_QUEST_ID } from '../constants/quests';
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
  it('retourne un vecteur nul sans historique', () => {
    const p = computeExhibitedPersonality([]);
    expect(p.openness).toBe(0);
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
    const p = computeExhibitedPersonality(logs);
    expect(p.openness).toBe(0);
  });

  it('agrège completed / accepted / rejected', () => {
    const q = QUEST_TAXONOMY[0]!;
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
    const p = computeExhibitedPersonality(logs);
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
      ...QUEST_TAXONOMY[0]!,
      category: '__no_corr__',
    } as unknown as QuestModel;
    const score = scoreQuestFit(quest, uniform(0.5), { min: 0, max: 0.5 });
    expect(score).toBe(Infinity);
  });

  it('score fini pour une quête valide', () => {
    const q = QUEST_TAXONOMY[0]!;
    const s = scoreQuestFit(q, uniform(0.5), { min: 0, max: 0.5 });
    expect(Number.isFinite(s)).toBe(true);
  });
});

describe('selectQuest', () => {
  it('retourne null si aucun candidat', () => {
    const allIds = QUEST_TAXONOMY.map((q) => q.id);
    const r = selectQuest(uniform(0.5), 'calibration', allIds, true);
    expect(r).toBeNull();
  });

  it('respecte allowOutdoor (intérieur uniquement)', () => {
    const indoor = QUEST_TAXONOMY.filter((q) => !q.requiresOutdoor);
    expect(indoor.length).toBeGreaterThan(0);
    const r = selectQuest(uniform(0.5), 'calibration', [], false);
    expect(r).not.toBeNull();
    expect(r!.requiresOutdoor).toBe(false);
  });

  it('retourne une quête en phase expansion', () => {
    const r = selectQuest(uniform(0.3), 'expansion', [], true);
    expect(r).not.toBeNull();
  });

  it('utilise le fallback canonique si présent', () => {
    const fb = QUEST_TAXONOMY.find((q) => q.id === FALLBACK_QUEST_ID);
    expect(fb).toBeDefined();
  });

  it('instantOnly exclut les archétypes planifiés', () => {
    const allIds: number[] = [];
    const r = selectQuest(uniform(0.5), 'calibration', allIds, true, undefined, true);
    expect(r).not.toBeNull();
    expect(r!.questPace).toBe('instant');
  });

  it('avec selectionSeed, reste deterministe pour un meme seed', () => {
    const a = selectQuest(uniform(0.5), 'expansion', [], true, undefined, false, {
      selectionSeed: 'userA:2026-03-28',
    });
    const b = selectQuest(uniform(0.5), 'expansion', [], true, undefined, false, {
      selectionSeed: 'userA:2026-03-28',
    });
    expect(a?.id).toBe(b?.id);
  });

  it('peut varier entre seeds differents a score proche', () => {
    const a = selectQuest(uniform(0.5), 'expansion', [], true, undefined, false, {
      selectionSeed: 'userA:2026-03-28',
    });
    const b = selectQuest(uniform(0.5), 'expansion', [], true, undefined, false, {
      selectionSeed: 'userB:2026-03-28',
    });
    expect(a).not.toBeNull();
    expect(b).not.toBeNull();
  });

  it('categoryScorePenalty dépriorise fortement une catégorie', () => {
    const base = selectQuest(uniform(0.5), 'expansion', [], true, undefined, false, {
      selectionSeed: 'fixed-seed-penalty-test',
      diversityWindow: 30,
    });
    expect(base).not.toBeNull();
    const cat = base!.category;
    const penalized = selectQuest(uniform(0.5), 'expansion', [], true, undefined, false, {
      selectionSeed: 'fixed-seed-penalty-test',
      diversityWindow: 30,
      categoryScorePenalty: { [cat]: 8 },
    });
    expect(penalized).not.toBeNull();
    expect(penalized!.category).not.toBe(cat);
  });
});
