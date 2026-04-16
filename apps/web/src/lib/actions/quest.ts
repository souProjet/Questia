'use server';

import {
  selectQuest,
  getEffectivePhase,
  computeExhibitedPersonality,
  computeCongruenceDelta,
} from '@questia/shared';
import type { PersonalityVector, QuestLog, QuestModel } from '@questia/shared';
import { checkWeatherSafety } from './weather';
import { getQuestTaxonomy, getDefaultFallbackArchetypeId } from '@/lib/quest-taxonomy/cache';
import { findArchetypeById } from '@/lib/quest-taxonomy/map-prisma';

export interface AssignQuestInput {
  declaredPersonality: PersonalityVector;
  /** Logs in **reverse chronological** order (newest first) — matches `computeExhibitedPersonality` expectations. */
  questLogs: QuestLog[];
  currentDay: number;
  lat?: number;
  lon?: number;
  todayIso?: string;
  selectionSeed?: string;
}

export interface AssignQuestResult {
  quest: QuestModel | null;
  phase: string;
  congruenceDelta: number;
  wasFallback: boolean;
  weatherSafe: boolean;
}

export async function assignDailyQuest(input: AssignQuestInput): Promise<AssignQuestResult> {
  const { declaredPersonality, questLogs, currentDay, lat, lon, todayIso, selectionSeed } = input;

  const taxonomy = await getQuestTaxonomy();
  const fallbackDefault = await getDefaultFallbackArchetypeId();

  const exhibited = computeExhibitedPersonality(questLogs, taxonomy);
  const delta = computeCongruenceDelta(declaredPersonality, exhibited);
  const recentLogs = questLogs.slice(0, 5);
  const phase = getEffectivePhase(currentDay, recentLogs, todayIso);
  const recentQuestIds = recentLogs.map((l) => l.questId);

  let weatherSafe = true;
  if (lat !== undefined && lon !== undefined) {
    const weather = await checkWeatherSafety(lat, lon);
    weatherSafe = weather.safe;
  }

  let quest = selectQuest(
    taxonomy,
    declaredPersonality,
    phase,
    recentQuestIds,
    weatherSafe,
    undefined,
    undefined,
    {
      exhibited,
      congruenceDelta: delta,
      selectionSeed,
      diversityWindow: selectionSeed ? 5 : undefined,
    },
  );

  let wasFallback = false;
  if (quest && !weatherSafe && quest.requiresOutdoor) {
    const fallbackId = quest.fallbackQuestId ?? fallbackDefault;
    quest = findArchetypeById(taxonomy, fallbackId) ?? quest;
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
