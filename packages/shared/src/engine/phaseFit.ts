import type { ComfortLevel, EscalationPhase, PersonalityVector, QuestModel } from '../types';
import { computeGentleness } from './congruence';

/**
 * Niveau de confort / intensité cible pour la consigne créative (phase d'escalade + douceur du profil).
 * Complète `computePhaseFit` (qui score des archétypes) en donnant une étiquette pour le prompt LLM.
 */
export function computeTargetComfortLevel(
  phase: EscalationPhase,
  scoringVector: PersonalityVector,
): ComfortLevel {
  const g = computeGentleness(scoringVector);
  if (phase === 'calibration') return g > 0.58 ? 'low' : 'moderate';
  if (phase === 'expansion') return g > 0.52 ? 'moderate' : 'high';
  return g > 0.48 ? 'high' : 'extreme';
}

/**
 * Adéquation entre la phase et l'intensité de l'archétype.
 * Score dans [0, 1] où 1 = parfaitement calibré pour la phase.
 *
 * Phase → niveau de confort idéal :
 *   - calibration : low / moderate (zone de confort, ne doit pas brusquer)
 *   - expansion   : moderate / high (léger inconfort accepté)
 *   - rupture     : high / extreme (challenge significatif, `extreme` est pleinement bienvenu)
 *
 * Tolérance asymétrique :
 *   - En calibration, aller trop loin (`extreme` dès le premier jour) est disqualifiant.
 *     Tolérance `down` permissive (on peut facilement proposer plus doux), `up` serrée.
 *   - En rupture, rester trop bas (`low` pour un user qui veut une claque) est disqualifiant.
 *     Tolérance `down` serrée, `up` très permissive (un `extreme` doit pouvoir scorer 1.0).
 *   - En expansion, équilibré.
 *
 * Modulation par la « douceur » du profil (computeGentleness) :
 *   un profil très doux se voit quand même pénalisé si l'archétype overshoot significativement,
 *   mais la pénalité reste douce (on ne veut pas tuer toute progression).
 */
const COMFORT_LEVEL_NUMERIC: Record<ComfortLevel, number> = {
  low: 1,
  moderate: 2,
  high: 3,
  extreme: 4,
};

const PHASE_TARGET_COMFORT: Record<EscalationPhase, number> = {
  calibration: 1.4,
  expansion: 2.5,
  rupture: 3.4,
};

/**
 * Tolérance autour du target — au-delà, le score décroît linéairement.
 * `down` = pénalité quand comfort < target, `up` = pénalité quand comfort > target.
 *
 * Intuition :
 *  - Calibration : très tolérant vers le bas (low = excellent), ferme vers le haut (moderate pénalisé,
 *    high et extreme disqualifiés). On ne veut surtout pas brusquer un user qui démarre.
 *  - Expansion : symétrique, moderate et high sont les cibles principales.
 *  - Rupture : ferme vers le bas (low/moderate disqualifiés), très tolérant vers le haut (extreme
 *    est pleinement bienvenu — fit~0.76 pour extreme vs 0.73 pour high → léger bonus à la rupture
 *    franche pour les profils qui peuvent l'absorber via l'affinity).
 */
const PHASE_TOLERANCE: Record<EscalationPhase, { down: number; up: number }> = {
  calibration: { down: 2.0, up: 1.0 },
  expansion: { down: 1.4, up: 1.4 },
  rupture: { down: 1.5, up: 2.5 },
};

/** Pénalité douceur (profil doux + quête trop dure pour la phase) — appliquée seulement quand comfort > target. */
const GENTLE_OVERSHOOT_PENALTY = 0.35;

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
  const tol = PHASE_TOLERANCE[phase];
  const delta = comfort - target;
  const tolerance = delta >= 0 ? tol.up : tol.down;
  let score = Math.max(0, 1 - Math.abs(delta) / tolerance);

  // Profil doux : pénalité supplémentaire si la quête overshoot la cible
  if (delta > 0) {
    const gentleness = computeGentleness(scoringVector);
    if (gentleness > 0.55) {
      score -= delta * GENTLE_OVERSHOOT_PENALTY * gentleness;
    }
  }

  return Math.max(0, Math.min(1, score));
}
