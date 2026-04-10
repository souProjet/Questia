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
      log.status === 'abandoned' ? 0 :
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
  /** Augmente le score (moins bon) par catégorie — ex. relances pour éviter le même « thème ». */
  categoryScorePenalty?: Partial<Record<PsychologicalCategory, number>>;
};

/**
 * Picks the best quest for the user given their profile and phase.
 * Filters out recently assigned quests and respects outdoor/weather constraints.
 * @param categoryBias — optionnel : valeurs positives réduisent le score (favorisent la catégorie), ex. questionnaire de raffinement.
 * @param instantOnly — si true, uniquement des archétypes « instant » (après report + relance).
 */
export function selectQuest(
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
  const candidates = QUEST_TAXONOMY
    .filter((q) => !recentQuestIds.includes(q.id))
    .filter((q) => allowOutdoor || !q.requiresOutdoor)
    .filter((q) => !instantOnly || q.questPace === 'instant');

  if (candidates.length === 0) return null;

  const bias = categoryBias ?? {};
  const catPen = options?.categoryScorePenalty;
  const gentle = computeGentleness(scoringVector);

  const scored = candidates
    .map((q) => {
      let score = scoreQuestFit(q, scoringVector, targetDelta);

      // Pénalité de confort : un profil doux est pénalisé pour les quêtes intenses.
      const comfort = COMFORT_NUMERIC[q.comfortLevel] ?? 2;
      const naturalComfort = 1 + (1 - gentle) * 2.5;
      const comfortExcess = Math.max(0, comfort - naturalComfort);
      const phaseComfortMult =
        phase === 'calibration' ? 0.22 :
        phase === 'expansion'  ? 0.10 :
        0.03;
      score += comfortExcess * phaseComfortMult * gentle;

      // Pénalité de durée : les profils doux préfèrent les actions courtes en début de parcours.
      if (gentle > 0.4 && phase !== 'rupture') {
        const durationExcess = Math.max(0, q.minimumDurationMinutes - 60);
        score += durationExcess * 0.0006 * gentle * (phase === 'calibration' ? 2 : 1);
      }

      // Bonus social négatif : un profil très peu extraverti en calibration
      // est pénalisé pour les quêtes qui exigent du social.
      if (q.requiresSocial && gentle > 0.55 && phase === 'calibration') {
        score += 0.12 * gentle;
      }

      const b = bias[q.category];
      if (b !== undefined) score -= b;
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
