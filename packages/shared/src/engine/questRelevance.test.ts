import { describe, expect, it } from 'vitest';
import type { EscalationPhase, PersonalityVector, QuestLog, QuestModel } from '../types';
import { computeCongruenceDelta, computeExhibitedPersonality, selectQuest } from './congruence';
import { getEffectivePhase } from './escalation';

type Persona = {
  id: string;
  declared: PersonalityVector;
};

const PERSONAS: Persona[] = [
  {
    id: 'introvert-structure',
    declared: {
      openness: 0.38,
      conscientiousness: 0.78,
      extraversion: 0.24,
      agreeableness: 0.62,
      emotionalStability: 0.57,
      thrillSeeking: 0.22,
      boredomSusceptibility: 0.33,
    },
  },
  {
    id: 'explorer-risk',
    declared: {
      openness: 0.88,
      conscientiousness: 0.47,
      extraversion: 0.73,
      agreeableness: 0.51,
      emotionalStability: 0.62,
      thrillSeeking: 0.86,
      boredomSusceptibility: 0.74,
    },
  },
  {
    id: 'social-empath',
    declared: {
      openness: 0.58,
      conscientiousness: 0.56,
      extraversion: 0.64,
      agreeableness: 0.9,
      emotionalStability: 0.6,
      thrillSeeking: 0.35,
      boredomSusceptibility: 0.46,
    },
  },
  {
    id: 'homebody-cautious',
    declared: {
      openness: 0.29,
      conscientiousness: 0.73,
      extraversion: 0.22,
      agreeableness: 0.71,
      emotionalStability: 0.74,
      thrillSeeking: 0.18,
      boredomSusceptibility: 0.27,
    },
  },
];

const COMFORT_SCORE: Record<QuestModel['comfortLevel'], number> = {
  low: 1,
  moderate: 2,
  high: 3,
  extreme: 4,
};

function buildQuestLog(questId: number, status: QuestLog['status'], phase: EscalationPhase): QuestLog {
  return {
    id: `${questId}-${Math.random().toString(16).slice(2)}`,
    userId: 'u',
    questId,
    assignedAt: new Date().toISOString(),
    status,
    congruenceDeltaAtAssignment: 0.2,
    phaseAtAssignment: phase,
    wasRerolled: false,
    wasFallback: false,
    safetyConsentGiven: false,
  };
}

function jaccardDistance(a: number[], b: number[]): number {
  const as = new Set(a);
  const bs = new Set(b);
  const inter = [...as].filter((x) => bs.has(x)).length;
  const union = new Set([...as, ...bs]).size;
  if (union === 0) return 0;
  return 1 - inter / union;
}

describe('quest relevance stress tests', () => {
  it('garde de la diversité et respecte les contraintes météo', () => {
    for (const persona of PERSONAS) {
      const questLogs: QuestLog[] = [];
      const chosen: QuestModel[] = [];

      for (let day = 1; day <= 28; day += 1) {
        const exhibited = computeExhibitedPersonality(questLogs);
        const delta = computeCongruenceDelta(persona.declared, exhibited);
        const phase = getEffectivePhase(day, questLogs.slice(-3));
        const recentQuestIds = questLogs.slice(-5).map((l) => l.questId);
        const allowOutdoor = day % 3 !== 0;

        const quest = selectQuest(
          persona.declared,
          phase,
          recentQuestIds,
          allowOutdoor,
          undefined,
          false,
          {
            exhibited,
            congruenceDelta: delta,
            selectionSeed: `${persona.id}:${day}`,
            diversityWindow: 7,
          },
        );

        expect(quest).not.toBeNull();
        expect(Boolean(allowOutdoor || !quest!.requiresOutdoor)).toBe(true);
        chosen.push(quest!);

        // Simule des retours réalistes pour alimenter le profil observé.
        const isHardForPersona =
          persona.declared.extraversion < 0.35 &&
          quest!.requiresSocial &&
          quest!.comfortLevel === 'extreme';
        const status: QuestLog['status'] = isHardForPersona && day % 2 === 0 ? 'rejected' : 'completed';
        questLogs.push(buildQuestLog(quest!.id, status, phase));
      }

      const uniqueIds = new Set(chosen.map((q) => q.id));
      const uniqueRatio = uniqueIds.size / chosen.length;
      const uniqueCategories = new Set(chosen.map((q) => q.category));

      expect(uniqueRatio).toBeGreaterThanOrEqual(0.52);
      expect(uniqueCategories.size).toBeGreaterThanOrEqual(6);
    }
  });

  it('fait monter la difficulté moyenne entre calibration et rupture', () => {
    for (const persona of PERSONAS) {
      const questLogs: QuestLog[] = [];
      let calScore = 0;
      let calCount = 0;
      let rupScore = 0;
      let rupCount = 0;

      for (let day = 1; day <= 24; day += 1) {
        const exhibited = computeExhibitedPersonality(questLogs);
        const delta = computeCongruenceDelta(persona.declared, exhibited);
        const phase = getEffectivePhase(day, questLogs.slice(-3));
        const recentQuestIds = questLogs.slice(-5).map((l) => l.questId);
        const quest = selectQuest(persona.declared, phase, recentQuestIds, true, undefined, false, {
          exhibited,
          congruenceDelta: delta,
          selectionSeed: `${persona.id}:${day}:difficulty`,
          diversityWindow: 7,
        });
        expect(quest).not.toBeNull();
        const score = COMFORT_SCORE[quest!.comfortLevel];
        if (day <= 3) {
          calScore += score;
          calCount += 1;
        }
        if (day >= 14) {
          rupScore += score;
          rupCount += 1;
        }
        questLogs.push(buildQuestLog(quest!.id, 'completed', phase));
      }

      const avgCal = calScore / Math.max(1, calCount);
      const avgRup = rupScore / Math.max(1, rupCount);
      expect(avgRup).toBeGreaterThanOrEqual(avgCal);
    }
  });

  it('produit des séquences distinctes entre profils opposés', () => {
    const first = PERSONAS[0]!;
    const second = PERSONAS[1]!;
    const aLogs: QuestLog[] = [];
    const bLogs: QuestLog[] = [];
    const aIds: number[] = [];
    const bIds: number[] = [];

    for (let day = 1; day <= 20; day += 1) {
      const aEx = computeExhibitedPersonality(aLogs);
      const bEx = computeExhibitedPersonality(bLogs);
      const aDelta = computeCongruenceDelta(first.declared, aEx);
      const bDelta = computeCongruenceDelta(second.declared, bEx);
      const aPhase = getEffectivePhase(day, aLogs.slice(-3));
      const bPhase = getEffectivePhase(day, bLogs.slice(-3));
      const aRecent = aLogs.slice(-5).map((l) => l.questId);
      const bRecent = bLogs.slice(-5).map((l) => l.questId);

      const aQ = selectQuest(first.declared, aPhase, aRecent, true, undefined, false, {
        exhibited: aEx,
        congruenceDelta: aDelta,
        selectionSeed: `A:${day}`,
        diversityWindow: 7,
      });
      const bQ = selectQuest(second.declared, bPhase, bRecent, true, undefined, false, {
        exhibited: bEx,
        congruenceDelta: bDelta,
        selectionSeed: `B:${day}`,
        diversityWindow: 7,
      });

      expect(aQ).not.toBeNull();
      expect(bQ).not.toBeNull();
      aIds.push(aQ!.id);
      bIds.push(bQ!.id);
      aLogs.push(buildQuestLog(aQ!.id, 'completed', aPhase));
      bLogs.push(buildQuestLog(bQ!.id, 'completed', bPhase));
    }

    const distance = jaccardDistance(aIds, bIds);
    expect(distance).toBeGreaterThan(0.25);
  });
});
