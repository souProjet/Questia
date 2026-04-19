import { describe, expect, it } from 'vitest';
import {
  computeCongruenceDelta,
  computeExhibitedPersonality,
  computeGentleness,
  hasExhibitedSignal,
  neutralExhibitedVector,
} from './congruence';
import { TEST_QUEST_TAXONOMY } from '../test-fixtures/testTaxonomy';
import type { PersonalityVector, QuestLog } from '../types';

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
  it('retourne la baseline neutre (0.5) sans historique', () => {
    const p = computeExhibitedPersonality([], TEST_QUEST_TAXONOMY);
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
    expect(p.openness).toBe(0.5);
  });

  it('un reject d\'une quête introspective ne rend pas tous les traits non corrélés extrêmes', () => {
    const introspective = TEST_QUEST_TAXONOMY.find((q) => q.category === 'public_introspection');
    if (!introspective) return;
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
    expect(p.conscientiousness).toBeGreaterThan(0.2);
    expect(p.conscientiousness).toBeLessThan(0.8);
  });

  it('agrège completed / accepted / rejected dans [0, 1]', () => {
    const q = TEST_QUEST_TAXONOMY[0]!;
    const logs: QuestLog[] = ['completed', 'accepted', 'rejected'].map((status, idx) => ({
      id: String(idx),
      userId: 'u',
      questId: q.id,
      assignedAt: '',
      status: status as QuestLog['status'],
      congruenceDeltaAtAssignment: 0,
      phaseAtAssignment: 'calibration',
      wasRerolled: false,
      wasFallback: false,
      safetyConsentGiven: false,
    }));
    const p = computeExhibitedPersonality(logs, TEST_QUEST_TAXONOMY);
    expect(Object.values(p).every((x) => x >= 0 && x <= 1)).toBe(true);
  });
});

describe('computeCongruenceDelta', () => {
  it('vaut 0 pour deux vecteurs identiques', () => {
    const v = uniform(0.5);
    expect(computeCongruenceDelta(v, v)).toBe(0);
  });

  it('augmente avec les écarts', () => {
    const a = uniform(0);
    const b = uniform(1);
    expect(computeCongruenceDelta(a, b)).toBeGreaterThan(0);
  });
});

describe('hasExhibitedSignal', () => {
  it('false pour le vecteur neutre', () => {
    expect(hasExhibitedSignal(neutralExhibitedVector())).toBe(false);
  });

  it('true dès qu\'un trait s\'écarte sensiblement de 0.5', () => {
    const v = neutralExhibitedVector();
    v.extraversion = 0.7;
    expect(hasExhibitedSignal(v)).toBe(true);
  });
});

describe('computeGentleness', () => {
  it('renvoie une valeur dans [0, 1] pour un profil typique', () => {
    const v = uniform(0.5);
    const g = computeGentleness(v);
    expect(g).toBeGreaterThanOrEqual(0);
    expect(g).toBeLessThanOrEqual(1);
  });

  it('un profil très extraverti et chercheur de sensations est moins doux', () => {
    const calm = uniform(0.5);
    calm.extraversion = 0.1;
    calm.thrillSeeking = 0.1;
    calm.openness = 0.3;
    calm.emotionalStability = 0.8;
    calm.boredomSusceptibility = 0.2;

    const fiery = uniform(0.5);
    fiery.extraversion = 0.9;
    fiery.thrillSeeking = 0.9;
    fiery.openness = 0.9;
    fiery.emotionalStability = 0.2;
    fiery.boredomSusceptibility = 0.9;

    expect(computeGentleness(calm)).toBeGreaterThan(computeGentleness(fiery));
  });
});
