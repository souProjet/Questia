import type { PsychologicalCategory, QuestModel } from '../types';
import type { ScoringQuestLog } from './selectionTypes';

/**
 * Score de fraîcheur dans [0, 1].
 *  - 1 : la catégorie n'a pas été servie récemment
 *  - 0 : très saturée (plusieurs occurrences récentes que l'user n'a pas appréciées)
 *
 * Particularité importante : la pénalité est **pondérée par le statut**.
 *   - completed → 0 (l'user a aimé, ne pas le punir d'aimer)
 *   - accepted  → 0.3
 *   - pending   → 0.5
 *   - rejected  → 1.0
 *   - abandoned → 0.7
 *   - replaced  → 0.6
 *
 * Ainsi un utilisateur qui complète régulièrement la même famille de quête ne se voit
 * PAS détourné de cette famille (problème majeur de l'ancien algorithme).
 */
const STATUS_REJECTION_WEIGHT: Record<ScoringQuestLog['status'], number> = {
  completed: 0,
  accepted: 0.3,
  pending: 0.5,
  abandoned: 0.7,
  replaced: 0.6,
  rejected: 1.0,
};

/** Pondération par fenêtre temporelle : la dernière quête pèse plus que celle d'il y a 5 jours. */
const RECENCY_DECAY = 0.82;

/** Saturation : au-delà, ce n'est plus la peine de baisser davantage. */
const FRESHNESS_FLOOR = 0.05;

export function computeFreshnessScore(
  archetype: QuestModel,
  recentLogs: ScoringQuestLog[],
  taxonomyById: Map<number, QuestModel>,
): number {
  let penalty = 0;
  let i = 0;
  for (const log of recentLogs) {
    const arch = taxonomyById.get(log.archetypeId);
    if (!arch) continue;
    if (arch.category !== archetype.category) {
      i++;
      continue;
    }
    const rejectionWeight = STATUS_REJECTION_WEIGHT[log.status] ?? 0.5;
    const recency = RECENCY_DECAY ** i;
    penalty += rejectionWeight * recency;
    i++;
  }
  // Normalisation : 1 occurrence rejected récente → ~0.0 ; 1 completed récente → 1.0
  const score = Math.max(FRESHNESS_FLOOR, 1 - penalty);
  return Math.min(1, score);
}

/**
 * Pénalité spécifique sur l'archétype lui-même (et non la catégorie) en cas de rejet/abandon récent.
 * Renvoie un facteur ∈ [0, 1] à multiplier au score final (1 = pas de pénalité, 0 = blocage doux).
 */
export function computeArchetypeFeedbackPenalty(
  archetypeId: number,
  recentLogs: ScoringQuestLog[],
): number {
  let penalty = 1;
  let i = 0;
  for (const log of recentLogs) {
    if (log.archetypeId === archetypeId && (log.status === 'rejected' || log.status === 'abandoned')) {
      const recency = RECENCY_DECAY ** i;
      penalty -= 0.4 * recency;
    }
    i++;
  }
  return Math.max(0, penalty);
}

/** Liste des catégories saturées récemment (utile pour debug / explainability). */
export function listSaturatedCategories(
  recentLogs: ScoringQuestLog[],
  taxonomyById: Map<number, QuestModel>,
  threshold = 1.5,
): PsychologicalCategory[] {
  const counts = new Map<PsychologicalCategory, number>();
  let i = 0;
  for (const log of recentLogs) {
    const arch = taxonomyById.get(log.archetypeId);
    if (!arch) continue;
    const w = STATUS_REJECTION_WEIGHT[log.status] ?? 0.5;
    const recency = RECENCY_DECAY ** i;
    counts.set(arch.category, (counts.get(arch.category) ?? 0) + w * recency);
    i++;
  }
  const out: PsychologicalCategory[] = [];
  for (const [cat, score] of counts) {
    if (score >= threshold) out.push(cat);
  }
  return out;
}
