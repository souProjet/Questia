import type { ComfortLevel, EscalationPhase, PersonalityVector, QuestModel } from '../types';
import { computeGentleness } from './congruence';

/**
 * Adéquation entre la phase et l'intensité de l'archétype.
 * Score dans [0, 1] où 1 = parfaitement calibré pour la phase.
 *
 * Phase → niveau de confort idéal :
 *   - calibration : low / moderate (zone de confort)
 *   - expansion   : moderate / high (léger inconfort accepté)
 *   - rupture     : high / extreme (challenge significatif)
 *
 * Modulation par la « douceur » du profil (computeGentleness) :
 *   un profil très doux préfère rester un cran en dessous du niveau « idéal phase »
 *   (sans pour autant l'interdire ; on veut juste éviter l'écrasement).
 */
const COMFORT_LEVEL_NUMERIC: Record<ComfortLevel, number> = {
  low: 1,
  moderate: 2,
  high: 3,
  extreme: 4,
};

const PHASE_TARGET_COMFORT: Record<EscalationPhase, number> = {
  calibration: 1.4,
  expansion: 2.4,
  rupture: 3.3,
};

/** Tolérance autour du target — au-delà, le score décroît linéairement. */
const PHASE_COMFORT_TOLERANCE = 1.0;

/** Pénalité douceur (profil doux + quête trop dure pour la phase) — appliquée seulement quand comfort > target. */
const GENTLE_OVERSHOOT_PENALTY = 0.5;

/**
 * Score d'adéquation phase ↔ archétype.
 */
export function computePhaseFit(
  archetype: QuestModel,
  phase: EscalationPhase,
  scoringVector: PersonalityVector,
): number {
  const comfort = COMFORT_LEVEL_NUMERIC[archetype.comfortLevel] ?? 2;
  const target = PHASE_TARGET_COMFORT[phase];
  const distance = Math.abs(comfort - target);
  let score = Math.max(0, 1 - distance / PHASE_COMFORT_TOLERANCE);

  // Profil doux : pénalité supplémentaire si la quête overshoot la cible
  if (comfort > target) {
    const gentleness = computeGentleness(scoringVector);
    if (gentleness > 0.55) {
      const overshoot = comfort - target;
      score -= overshoot * GENTLE_OVERSHOOT_PENALTY * gentleness;
    }
  }

  return Math.max(0, Math.min(1, score));
}
