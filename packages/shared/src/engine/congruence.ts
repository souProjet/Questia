import type { PersonalityVector, PsychologicalCategory, QuestLog, QuestModel } from '../types';
import { ACTIVITY_PERSONALITY_CORRELATION, PERSONALITY_KEYS } from '../constants/personality';
import {
  CATEGORY_TOTAL_PENALTY_CAP,
  COMFORT_NUMERIC,
  COMFORT_PHASE_MULTIPLIER,
  DEFAULT_DIVERSITY_WINDOW,
  DURATION_EXCESS_PENALTY_PER_MIN,
  DURATION_SOFT_CAP_MIN,
  EXHIBITED_BASELINE,
  EXHIBITED_MAX_SHIFT,
  EXHIBITED_SIGNAL_EPSILON,
  FIT_MIN_ROOM,
  FIT_SHIFT_GAIN,
  GENTLENESS_WEIGHTS,
  GENTLE_SOCIAL_PENALTY,
  GENTLE_SOCIAL_PENALTY_THRESHOLD,
  JITTER_ABSOLUTE_CAP,
  JITTER_INDEX_STEP,
  JITTER_MIN_AMPLITUDE,
  JITTER_SPREAD_FRACTION,
  MIX_DEFAULT_DELTA,
  MIX_PHASE_CAP,
  MIX_PHASE_MULTIPLIER,
  MIX_RUPTURE_BONUS,
  MIX_WEIGHT_MAX,
  MIX_WEIGHT_MIN,
  RECENCY_DECAY,
  STATUS_WEIGHT,
} from './engineParams';

/** Neutral baseline vector (0.5 on every dimension), comparable directly with declared. */
export function neutralExhibitedVector(): PersonalityVector {
  return {
    openness: EXHIBITED_BASELINE,
    conscientiousness: EXHIBITED_BASELINE,
    extraversion: EXHIBITED_BASELINE,
    agreeableness: EXHIBITED_BASELINE,
    emotionalStability: EXHIBITED_BASELINE,
    thrillSeeking: EXHIBITED_BASELINE,
    boredomSusceptibility: EXHIBITED_BASELINE,
  };
}

function zeroVector(): PersonalityVector {
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
 * Computes the exhibited personality vector p_ex from quest history, in the
 * same [0,1] space as `declared`.
 *
 *   p_ex[k] = clamp01( 0.5 + EXHIBITED_MAX_SHIFT * (Σ w_i * c_i) / Σ |w_i| )
 *
 * Key difference with the old implementation : we no longer clamp the raw
 * weighted sum to [0, 1]. Clamping the raw sum produced a **different space**
 * from `declared` (negative correlations were folded to 0, making an
 * introspective profile read as "maximally introverted" on *all* dimensions
 * it didn't reinforce). Here we center on 0.5 so both vectors can be compared
 * directly by `computeCongruenceDelta` and mixed in `mixPersonality`.
 *
 * Status weights and recency decay live in `engineParams.ts`.
 * Logs are expected in reverse chronological order (newest first).
 */
export function computeExhibitedPersonality(
  logs: QuestLog[],
  taxonomy: QuestModel[],
): PersonalityVector {
  const acc = zeroVector();
  let totalWeight = 0;

  const questById = new Map(taxonomy.map((q) => [q.id, q]));

  for (let i = 0; i < logs.length; i++) {
    const log = logs[i];
    const quest = questById.get(log.questId);
    if (!quest) continue;

    const statusWeight = STATUS_WEIGHT[log.status] ?? 0;
    if (statusWeight === 0) continue;

    const recency = RECENCY_DECAY ** i;
    const w = statusWeight * recency;

    const correlation = ACTIVITY_PERSONALITY_CORRELATION[quest.category];
    if (!correlation) continue;

    for (const key of PERSONALITY_KEYS) {
      const c = correlation[key] ?? 0;
      acc[key] += w * c;
    }
    totalWeight += Math.abs(w);
  }

  if (totalWeight <= 0) return neutralExhibitedVector();

  const out = zeroVector();
  for (const key of PERSONALITY_KEYS) {
    const signed = acc[key] / totalWeight; // in [-1, 1]
    const value = EXHIBITED_BASELINE + EXHIBITED_MAX_SHIFT * signed;
    out[key] = Math.max(0, Math.min(1, value));
  }
  return out;
}

/**
 * Calculates the Congruence Delta: Δ_cong = ‖p_r − p_ex‖
 * Euclidean distance normalized by the number of dimensions (both vectors in [0,1]).
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
 * Scores a quest candidate based on how well its expected delta matches the
 * *range* prescribed by the current phase (not just its midpoint).
 *
 * Inside the band : score 0 (perfect fit).
 * Outside : distance to the closest bound.
 *
 * Lower = better.
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
    const current = scoringVector[key] ?? EXHIBITED_BASELINE;
    const room = corr >= 0 ? 1 - current : current;
    const shift = corr * FIT_SHIFT_GAIN * Math.max(room, FIT_MIN_ROOM);
    const expectedExhibited = Math.max(0, Math.min(1, current + shift));
    const diff = current - expectedExhibited;
    sumSquared += diff * diff;
    dims++;
  }

  const expectedDelta = Math.sqrt(sumSquared / dims);
  if (expectedDelta < targetDelta.min) return targetDelta.min - expectedDelta;
  if (expectedDelta > targetDelta.max) return expectedDelta - targetDelta.max;
  return 0;
}

/**
 * Score 0-1 : plus il est haut, plus le profil est « doux »
 * (peu extraverti, peu chercheur de sensations, ouverture modérée, stable).
 */
export function computeGentleness(p: PersonalityVector): number {
  return (
    (1 - (p.extraversion ?? 0.5)) * GENTLENESS_WEIGHTS.extraversion +
    (1 - (p.thrillSeeking ?? 0.5)) * GENTLENESS_WEIGHTS.thrillSeeking +
    (1 - (p.openness ?? 0.5)) * GENTLENESS_WEIGHTS.openness +
    (p.emotionalStability ?? 0.5) * GENTLENESS_WEIGHTS.emotionalStability +
    (1 - (p.boredomSusceptibility ?? 0.5)) * GENTLENESS_WEIGHTS.boredomSusceptibility
  );
}

/**
 * Returns true when the exhibited vector carries meaningful signal
 * (at least one dimension drifted far enough from the neutral baseline).
 */
export function hasExhibitedSignal(exhibited: PersonalityVector | undefined): boolean {
  if (!exhibited) return false;
  return PERSONALITY_KEYS.some(
    (k) => Math.abs((exhibited[k] ?? EXHIBITED_BASELINE) - EXHIBITED_BASELINE) > EXHIBITED_SIGNAL_EPSILON,
  );
}

/**
 * Mélange déclaré / observé pour noter les quêtes : plus la phase avance et
 * plus Δ est haut, plus le comportement récent doit peser (sans écraser
 * l'identité déclarée).
 */
function mixPersonality(
  declared: PersonalityVector,
  exhibited: PersonalityVector | undefined,
  congruenceDelta: number | undefined,
  phase: 'calibration' | 'expansion' | 'rupture',
): PersonalityVector {
  if (!hasExhibitedSignal(exhibited)) return declared;
  const delta = congruenceDelta ?? MIX_DEFAULT_DELTA;
  let w = Math.min(MIX_WEIGHT_MAX, Math.max(MIX_WEIGHT_MIN, delta));
  w *= MIX_PHASE_MULTIPLIER[phase];
  if (phase === 'rupture') w += MIX_RUPTURE_BONUS;
  w = Math.min(MIX_PHASE_CAP[phase], w);

  const out = zeroVector();
  for (const key of PERSONALITY_KEYS) {
    out[key] = declared[key] * (1 - w) + (exhibited as PersonalityVector)[key] * w;
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
 * @param categoryBias — Convention **positive = favorise** (inversée en interne).
 *   Ne pas confondre avec `options.categoryScorePenalty` (positive = pénalise).
 * @param instantOnly — si true, uniquement des archétypes « instant » (après report + relance).
 * @param taxonomy — liste d'archétypes (ex. chargée depuis la base).
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

  // categoryBias: positive = favours → negate to unify with "positive = penalty".
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

      const comfort = (COMFORT_NUMERIC as Record<string, number>)[q.comfortLevel] ?? 2;
      const naturalComfort = 1 + (1 - gentle) * 2.5;
      const comfortExcess = Math.max(0, comfort - naturalComfort);
      score += comfortExcess * COMFORT_PHASE_MULTIPLIER[phase] * gentle;

      if (gentle > 0.4 && phase !== 'rupture') {
        const durationExcess = Math.max(0, q.minimumDurationMinutes - DURATION_SOFT_CAP_MIN);
        score +=
          durationExcess *
          DURATION_EXCESS_PENALTY_PER_MIN *
          gentle *
          (phase === 'calibration' ? 2 : 1);
      }

      if (q.requiresSocial && gentle > GENTLE_SOCIAL_PENALTY_THRESHOLD && phase === 'calibration') {
        score += GENTLE_SOCIAL_PENALTY * gentle;
      }

      // Unified category adjustments: positive = penalty, capped globally.
      const rawBias = biasPenalty[q.category] ?? 0;
      const rawPen = catPen?.[q.category] ?? 0;
      const totalCatPenalty = Math.max(
        -CATEGORY_TOTAL_PENALTY_CAP,
        Math.min(CATEGORY_TOTAL_PENALTY_CAP, rawBias + rawPen),
      );
      score += totalCatPenalty;
      return { quest: q, score };
    })
    .sort((a, b) => a.score - b.score);

  if (!options?.selectionSeed) return scored[0].quest;

  const window = Math.max(
    1,
    Math.min(scored.length, options.diversityWindow ?? DEFAULT_DIVERSITY_WINDOW),
  );
  const slice = scored.slice(0, window);

  // Jitter échelonné selon le "spread" réel de la fenêtre → ne peut jamais
  // écraser un vrai écart de score, tout en apportant de la diversité quand
  // les scores sont quasi ex-aequo (cas fréquent quand plusieurs archétypes
  // tombent dans la plage cible `targetDelta`).
  const spread = slice[slice.length - 1].score - slice[0].score;
  const jitterAmplitude = Math.min(
    JITTER_ABSOLUTE_CAP,
    Math.max(JITTER_MIN_AMPLITUDE, spread * JITTER_SPREAD_FRACTION),
  );

  const seeded = slice
    .map((entry, idx) => {
      const jitter = (hashToUnit(`${options.selectionSeed}:${entry.quest.id}`) - 0.5) * 2 * jitterAmplitude;
      return {
        quest: entry.quest,
        score: entry.score + idx * JITTER_INDEX_STEP + jitter,
      };
    })
    .sort((a, b) => a.score - b.score);

  return seeded[0].quest;
}
