import type { PersonalityVector, PsychologicalCategory, QuestLog, QuestModel } from '../types';
import { ACTIVITY_PERSONALITY_CORRELATION, PERSONALITY_KEYS } from '../constants/personality';

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
 * p_ex = normalize( sum_j( recency(j) * statusWeight(j) * C[category(j)] ) )
 *
 * Status weights:
 *  +1.0 for completed quests
 *  +0.3 for accepted but not completed
 *  -0.5 for rejected quests
 *
 * Recency: exponential decay — the first log (most recent) has weight 1,
 * each subsequent log is multiplied by RECENCY_DECAY (0.88).
 * This ensures recent behaviour outweighs old habits.
 *
 * Logs are expected in reverse chronological order (newest first).
 */
const RECENCY_DECAY = 0.88;

export function computeExhibitedPersonality(logs: QuestLog[], taxonomy: QuestModel[]): PersonalityVector {
  const pEx = emptyVector();
  let totalWeight = 0;

  const questById = new Map(taxonomy.map((q) => [q.id, q]));

  for (let i = 0; i < logs.length; i++) {
    const log = logs[i];
    const quest = questById.get(log.questId);
    if (!quest) continue;

    const statusWeight =
      log.status === 'completed' ? 1.0 :
      log.status === 'accepted'  ? 0.3 :
      log.status === 'rejected'  ? -0.5 :
      log.status === 'abandoned' ? 0 :
      0;

    if (statusWeight === 0) continue;

    const recency = RECENCY_DECAY ** i;
    const w = statusWeight * recency;

    const correlation = ACTIVITY_PERSONALITY_CORRELATION[quest.category];
    if (!correlation) continue;

    for (const key of PERSONALITY_KEYS) {
      const c = correlation[key] ?? 0;
      pEx[key] += w * c;
    }
    totalWeight += Math.abs(w);
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
 *
 * The expected delta measures how far the user's *scoring personality*
 * would shift if they completed this quest category.  We blend the
 * category correlation with the user's current vector so the result
 * genuinely depends on who the user is (not just on the category).
 *
 * Lower score = better fit.
 */
export function scoreQuestFit(
  quest: QuestModel,
  scoringVector: PersonalityVector,
  targetDelta: { min: number; max: number },
): number {
  const correlation = ACTIVITY_PERSONALITY_CORRELATION[quest.category];
  if (!correlation) return Infinity;

  let sumSquared = 0;
  let dims = 0;
  for (const key of PERSONALITY_KEYS) {
    const corr = correlation[key] ?? 0;
    const current = scoringVector[key] ?? 0.5;
    // Where this trait would land after doing this activity type.
    // Shift is proportional to correlation *and* room to move.
    const room = corr >= 0 ? 1 - current : current;
    const shift = corr * 0.5 * room;
    const expectedExhibited = Math.max(0, Math.min(1, current + shift));
    const diff = current - expectedExhibited;
    sumSquared += diff * diff;
    dims++;
  }

  const expectedDelta = Math.sqrt(sumSquared / dims);
  const targetMid = (targetDelta.min + targetDelta.max) / 2;
  return Math.abs(expectedDelta - targetMid);
}

const COMFORT_NUMERIC: Record<string, number> = {
  low: 1,
  moderate: 2,
  high: 3,
  extreme: 4,
};

/**
 * Score 0-1 : plus il est haut, plus le profil est « doux »
 * (peu extraverti, peu chercheur de sensations, ouverture modérée, stable).
 * Sert à doser le confort acceptable d'une quête.
 */
export function computeGentleness(p: PersonalityVector): number {
  return (
    (1 - (p.extraversion ?? 0.5)) * 0.30 +
    (1 - (p.thrillSeeking ?? 0.5)) * 0.25 +
    (1 - (p.openness ?? 0.5)) * 0.20 +
    (p.emotionalStability ?? 0.5) * 0.10 +
    (1 - (p.boredomSusceptibility ?? 0.5)) * 0.15
  );
}

/**
 * Mélange déclaré / observé pour noter les quêtes : plus la phase avance et plus Δ est haut,
 * plus le comportement récent doit peser (sans écraser l’identité déclarée).
 */
function mixPersonality(
  declared: PersonalityVector,
  exhibited: PersonalityVector | undefined,
  congruenceDelta: number | undefined,
  phase: 'calibration' | 'expansion' | 'rupture',
): PersonalityVector {
  if (!exhibited) return declared;
  const delta = congruenceDelta ?? 0.22;
  let w = Math.min(0.45, Math.max(0.12, delta));
  if (phase === 'calibration') {
    w *= 0.78;
  } else if (phase === 'expansion') {
    w = Math.min(0.48, w * 1.05);
  } else {
    w = Math.min(0.54, w * 1.14 + 0.035);
  }
  const out = emptyVector();
  for (const key of PERSONALITY_KEYS) {
    out[key] = declared[key] * (1 - w) + exhibited[key] * w;
  }
  return out;
}

function hashToUnit(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 1_000_000) / 1_000_000;
}

type SelectQuestOptions = {
  exhibited?: PersonalityVector;
  congruenceDelta?: number;
  selectionSeed?: string;
  diversityWindow?: number;
  /**
   * Unified per-category score adjustment.
   * **Positive = penalty (higher score = less likely to be selected).**
   * Merge all penalty sources (reroll, recent-history, etc.) before passing.
   */
  categoryScorePenalty?: Partial<Record<PsychologicalCategory, number>>;
};

/**
 * Picks the best quest for the user given their profile and phase.
 * Filters out recently assigned quests and respects outdoor/weather constraints.
 * @param categoryBias — optionnel : valeurs positives réduisent le score (favorisent la catégorie), ex. questionnaire de raffinement.
 * @param instantOnly — si true, uniquement des archétypes « instant » (après report + relance).
 * @param taxonomy — liste d’archétypes (ex. chargée depuis la base).
 */
export function selectQuest(
  taxonomy: QuestModel[],
  declared: PersonalityVector,
  phase: 'calibration' | 'expansion' | 'rupture',
  recentQuestIds: number[],
  allowOutdoor: boolean,
  categoryBias?: Partial<Record<PsychologicalCategory, number>>,
  instantOnly?: boolean,
  options?: SelectQuestOptions,
): QuestModel | null {
  const targetDelta = getTargetDelta(phase);
  const scoringVector = mixPersonality(declared, options?.exhibited, options?.congruenceDelta, phase);
  const recentSet = new Set(recentQuestIds);
  const candidates = taxonomy
    .filter((q) => !recentSet.has(q.id))
    .filter((q) => allowOutdoor || !q.requiresOutdoor)
    .filter((q) => !instantOnly || q.questPace === 'instant');

  if (candidates.length === 0) return null;

  // Convert refinement bias to the unified convention (positive = penalty).
  // categoryBias: positive = favours → negate to get a penalty.
  const biasPenalty: Partial<Record<PsychologicalCategory, number>> = {};
  if (categoryBias) {
    for (const k of Object.keys(categoryBias) as PsychologicalCategory[]) {
      const v = categoryBias[k];
      if (v !== undefined) biasPenalty[k] = -v;
    }
  }

  const catPen = options?.categoryScorePenalty;
  const gentle = computeGentleness(scoringVector);

  const scored = candidates
    .map((q) => {
      let score = scoreQuestFit(q, scoringVector, targetDelta);

      const comfort = COMFORT_NUMERIC[q.comfortLevel] ?? 2;
      const naturalComfort = 1 + (1 - gentle) * 2.5;
      const comfortExcess = Math.max(0, comfort - naturalComfort);
      const phaseComfortMult =
        phase === 'calibration' ? 0.22 :
        phase === 'expansion'  ? 0.10 :
        0.03;
      score += comfortExcess * phaseComfortMult * gentle;

      if (gentle > 0.4 && phase !== 'rupture') {
        const durationExcess = Math.max(0, q.minimumDurationMinutes - 60);
        score += durationExcess * 0.0006 * gentle * (phase === 'calibration' ? 2 : 1);
      }

      if (q.requiresSocial && gentle > 0.55 && phase === 'calibration') {
        score += 0.12 * gentle;
      }

      // All category adjustments: positive = penalty (unified convention).
      const bp = biasPenalty[q.category];
      if (bp !== undefined) score += bp;
      const p = catPen?.[q.category];
      if (p !== undefined) score += p;
      return { quest: q, score };
    })
    .sort((a, b) => a.score - b.score);

  if (!options?.selectionSeed) return scored[0].quest;

  const window = Math.max(
    1,
    Math.min(scored.length, options.diversityWindow ?? 4),
  );
  const seeded = scored
    .slice(0, window)
    .map((entry, idx) => {
      // Jitter léger et stable : varie entre utilisateurs/jours sans casser le fit.
      const jitter = (hashToUnit(`${options.selectionSeed}:${entry.quest.id}`) - 0.5) * 0.24;
      return {
        quest: entry.quest,
        score: entry.score + idx * 0.012 + jitter,
      };
    })
    .sort((a, b) => a.score - b.score);

  return seeded[0].quest;
}
