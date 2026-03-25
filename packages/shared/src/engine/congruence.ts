import type { PersonalityVector, PsychologicalCategory, QuestLog, QuestModel } from '../types';
import { ACTIVITY_PERSONALITY_CORRELATION, PERSONALITY_KEYS } from '../constants/personality';
import { QUEST_TAXONOMY } from '../constants/quests';

/**
 * Creates a zero-initialized personality vector.
 */
function emptyVector(): PersonalityVector {
  return {
    openness: 0,
    conscientiousness: 0,
    extraversion: 0,
    agreeableness: 0,
    emotionalStability: 0,
    thrillSeeking: 0,
    boredomSusceptibility: 0,
  };
}

/**
 * Computes the exhibited personality vector p_ex from quest history.
 *
 * p_ex = normalize( sum_j( weight(j) * C[category(j)] ) )
 *
 * where weight(j) is:
 *  +1.0 for completed quests
 *  +0.3 for accepted but not completed
 *  -0.5 for rejected quests
 */
export function computeExhibitedPersonality(logs: QuestLog[]): PersonalityVector {
  const pEx = emptyVector();
  let totalWeight = 0;

  for (const log of logs) {
    const quest = QUEST_TAXONOMY.find((q) => q.id === log.questId);
    if (!quest) continue;

    const weight =
      log.status === 'completed' ? 1.0 :
      log.status === 'accepted'  ? 0.3 :
      log.status === 'rejected'  ? -0.5 :
      0;

    if (weight === 0) continue;

    const correlation = ACTIVITY_PERSONALITY_CORRELATION[quest.category];
    if (!correlation) continue;

    for (const key of PERSONALITY_KEYS) {
      const c = correlation[key] ?? 0;
      pEx[key] += weight * c;
    }
    totalWeight += Math.abs(weight);
  }

  if (totalWeight > 0) {
    for (const key of PERSONALITY_KEYS) {
      pEx[key] = Math.max(0, Math.min(1, pEx[key] / totalWeight));
    }
  }

  return pEx;
}

/**
 * Calculates the Congruence Delta: Δ_cong = ‖p_r − p_ex‖
 * Uses Euclidean distance normalized by the number of dimensions.
 */
export function computeCongruenceDelta(
  declared: PersonalityVector,
  exhibited: PersonalityVector,
): number {
  let sumSquared = 0;
  for (const key of PERSONALITY_KEYS) {
    const diff = declared[key] - exhibited[key];
    sumSquared += diff * diff;
  }
  return Math.sqrt(sumSquared / PERSONALITY_KEYS.length);
}

/**
 * Selects a target Congruence Delta based on the current escalation phase.
 * Calibration: delta ≈ 0 (comfort zone)
 * Expansion: delta ≈ 0.15–0.35 (gentle push)
 * Rupture: delta ≈ 0.4–0.7 (strong contrast)
 */
export function getTargetDelta(phase: 'calibration' | 'expansion' | 'rupture'): { min: number; max: number } {
  switch (phase) {
    case 'calibration':
      return { min: 0, max: 0.1 };
    case 'expansion':
      return { min: 0.15, max: 0.35 };
    case 'rupture':
      return { min: 0.4, max: 0.7 };
  }
}

/**
 * Scores a quest candidate based on how well its expected delta
 * matches the target delta for the current phase.
 * Lower score = better fit.
 */
export function scoreQuestFit(
  quest: QuestModel,
  declared: PersonalityVector,
  targetDelta: { min: number; max: number },
): number {
  const correlation = ACTIVITY_PERSONALITY_CORRELATION[quest.category];
  if (!correlation) return Infinity;

  let sumSquared = 0;
  let dims = 0;
  for (const key of PERSONALITY_KEYS) {
    const traitCorrelation = correlation[key] ?? 0;
    const expectedExhibited = Math.max(0, Math.min(1,
      declared[key] + traitCorrelation * 0.5
    ));
    const diff = declared[key] - expectedExhibited;
    sumSquared += diff * diff;
    dims++;
  }

  const expectedDelta = Math.sqrt(sumSquared / dims);
  const targetMid = (targetDelta.min + targetDelta.max) / 2;
  return Math.abs(expectedDelta - targetMid);
}

/**
 * Picks the best quest for the user given their profile and phase.
 * Filters out recently assigned quests and respects outdoor/weather constraints.
 * @param categoryBias — optionnel : valeurs positives réduisent le score (favorisent la catégorie), ex. questionnaire de raffinement.
 */
export function selectQuest(
  declared: PersonalityVector,
  phase: 'calibration' | 'expansion' | 'rupture',
  recentQuestIds: number[],
  allowOutdoor: boolean,
  categoryBias?: Partial<Record<PsychologicalCategory, number>>,
): QuestModel | null {
  const targetDelta = getTargetDelta(phase);
  const candidates = QUEST_TAXONOMY
    .filter((q) => !recentQuestIds.includes(q.id))
    .filter((q) => allowOutdoor || !q.requiresOutdoor);

  if (candidates.length === 0) return null;

  const bias = categoryBias ?? {};
  const scored = candidates
    .map((q) => {
      let score = scoreQuestFit(q, declared, targetDelta);
      const b = bias[q.category];
      if (b !== undefined) score -= b;
      return { quest: q, score };
    })
    .sort((a, b) => a.score - b.score);

  return scored[0].quest;
}
