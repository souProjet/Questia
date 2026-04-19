import type { PersonalityVector, QuestLog, QuestModel } from '../types';
import { ACTIVITY_PERSONALITY_CORRELATION, PERSONALITY_KEYS } from '../constants/personality';
import {
  EXHIBITED_BASELINE,
  EXHIBITED_MAX_SHIFT,
  EXHIBITED_SIGNAL_EPSILON,
  GENTLENESS_WEIGHTS,
  RECENCY_DECAY,
  STATUS_WEIGHT,
} from './engineParams';

/** Vecteur neutre (0.5 partout), comparable directement à `declared`. */
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
 * Calcule le vecteur de personnalité observée p_ex à partir de l'historique,
 * dans le même espace [0,1] que `declared`.
 *
 *   p_ex[k] = clamp01( 0.5 + EXHIBITED_MAX_SHIFT * (Σ w_i * c_i) / Σ |w_i| )
 *
 * Les logs sont attendus en ordre **antichronologique** (le plus récent en
 * premier). Les poids de statut et la décroissance de récence vivent dans
 * `engineParams.ts`.
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
    const signed = acc[key] / totalWeight;
    const value = EXHIBITED_BASELINE + EXHIBITED_MAX_SHIFT * signed;
    out[key] = Math.max(0, Math.min(1, value));
  }
  return out;
}

/**
 * Δ_cong = ‖p_r − p_ex‖ (distance euclidienne normalisée par le nombre de
 * dimensions). Les deux vecteurs vivent dans [0,1].
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
 * Score 0-1 : plus il est haut, plus le profil est « doux »
 * (peu extraverti, peu chercheur de sensations, ouverture modérée, stable).
 *
 * Utilisé par le moteur de phase fit pour assouplir les quêtes
 * à fort confort sur les profils introvertis/calmes.
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
 * Vrai dès qu'au moins une dimension du vecteur observé s'écarte de la
 * baseline neutre — utilisé pour décider si l'on injecte la personnalité
 * observée dans le prompt LLM.
 */
export function hasExhibitedSignal(exhibited: PersonalityVector | undefined): boolean {
  if (!exhibited) return false;
  return PERSONALITY_KEYS.some(
    (k) => Math.abs((exhibited[k] ?? EXHIBITED_BASELINE) - EXHIBITED_BASELINE) > EXHIBITED_SIGNAL_EPSILON,
  );
}
