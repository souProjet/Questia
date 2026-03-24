'use server';

import { selectQuest, getEffectivePhase, computeExhibitedPersonality, computeCongruenceDelta, FALLBACK_QUEST_ID, QUEST_TAXONOMY } from '@questia/shared';
import type { PersonalityVector, QuestLog, QuestModel } from '@questia/shared';
import { checkWeatherSafety } from './weather';

export interface AssignQuestInput {
  declaredPersonality: PersonalityVector;
  questLogs: QuestLog[];
  currentDay: number;
  lat?: number;
  lon?: number;
}

export interface AssignQuestResult {
  quest: QuestModel | null;
  phase: string;
  congruenceDelta: number;
  wasFallback: boolean;
  weatherSafe: boolean;
}

export async function assignDailyQuest(input: AssignQuestInput): Promise<AssignQuestResult> {
  const { declaredPersonality, questLogs, currentDay, lat, lon } = input;

  const exhibited = computeExhibitedPersonality(questLogs);
  const delta = computeCongruenceDelta(declaredPersonality, exhibited);
  const recentLogs = questLogs.slice(-3);
  const phase = getEffectivePhase(currentDay, recentLogs);
  const recentQuestIds = questLogs.slice(-5).map((l) => l.questId);

  let weatherSafe = true;
  if (lat !== undefined && lon !== undefined) {
    const weather = await checkWeatherSafety(lat, lon);
    weatherSafe = weather.safe;
  }

  let quest = selectQuest(declaredPersonality, phase, recentQuestIds, weatherSafe);

  let wasFallback = false;
  if (quest && !weatherSafe && quest.requiresOutdoor) {
    const fallbackId = quest.fallbackQuestId ?? FALLBACK_QUEST_ID;
    quest = QUEST_TAXONOMY.find((q) => q.id === fallbackId) ?? quest;
    wasFallback = true;
  }

  return {
    quest,
    phase,
    congruenceDelta: delta,
    wasFallback,
    weatherSafe,
  };
}
