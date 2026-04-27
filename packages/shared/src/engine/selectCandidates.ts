import type { QuestModel } from '../types';
import { archetypeNeedsTravelOrPlanning } from '../constants/quests';
import { computeAffinityScore } from './affinity';
import { computeArchetypeFeedbackPenalty, computeFreshnessScore } from './freshness';
import { computePhaseFit } from './phaseFit';
import {
  DEFAULT_CANDIDATE_POOL_SIZE,
  DEFAULT_RECENT_EXCLUSION_DAYS,
  DEFAULT_SCORE_WEIGHTS,
  type CandidateScore,
  type ProfileSnapshot,
  type QuestCandidate,
  type ScoreWeights,
  type ScoringQuestLog,
} from './selectionTypes';
import type { HeavyQuestPreference } from '../profilePreferences';

function heavyQuestScoreMultiplier(
  pref: HeavyQuestPreference | undefined,
  archetype: QuestModel,
): number {
  if (!archetypeNeedsTravelOrPlanning(archetype)) return 1;
  const p = pref ?? 'balanced';
  if (p === 'low') return 0.48;
  if (p === 'high') return 1.14;
  return 1;
}

export interface SelectCandidatesOptions {
  /** Nombre max de candidats retenus (défaut : 5). */
  poolSize?: number;
  /** Pondération des composantes du score (défaut : DEFAULT_SCORE_WEIGHTS). */
  weights?: ScoreWeights;
  /** Fenêtre d'exclusion (jours) pour les archétypes récemment servis (défaut : 7). */
  recentExclusionDays?: number;
  /** Graine déterministe pour le départage des ex-aequo (stable par jour/utilisateur). */
  selectionSeed?: string;
  /** Date du jour (ISO YYYY-MM-DD) pour calculer la fenêtre d'exclusion. */
  todayIso?: string;
}

export interface SelectCandidatesResult {
  /** Top-N candidats triés par score décroissant. */
  candidates: QuestCandidate[];
  /** Tous les candidats scorés (pour debug). */
  allScored: QuestCandidate[];
  /** Catégories filtrées par les hard filters (pour debug). */
  excludedReasons: Map<number, string>;
}

/**
 * Sélection : pure, déterministe, transparente.
 *
 *  1. Filtres durs (exclusions, outdoor sans météo, social déféré, instantOnly, fraîcheur récente)
 *  2. Score doux pondéré (affinity + phaseFit + freshness + refinement) avec pénalité feedback explicite
 *  3. Top-N candidats (défaut N=5) — l'IA fera le choix final + rédaction
 *  4. Tie-break stable via seed (sinon par id pour reproductibilité tests)
 */
export function selectCandidates(
  taxonomy: QuestModel[],
  profile: ProfileSnapshot,
  options: SelectCandidatesOptions = {},
): SelectCandidatesResult {
  const poolSize = Math.max(1, options.poolSize ?? DEFAULT_CANDIDATE_POOL_SIZE);
  const weights = options.weights ?? DEFAULT_SCORE_WEIGHTS;
  const recentDays = options.recentExclusionDays ?? DEFAULT_RECENT_EXCLUSION_DAYS;

  const taxonomyById = new Map<number, QuestModel>(taxonomy.map((q) => [q.id, q]));

  const recentlyServedIds = collectRecentlyServedIds(
    profile.recentLogs,
    recentDays,
    options.todayIso,
  );

  const excludedReasons = new Map<number, string>();
  const scored: QuestCandidate[] = [];

  // Vecteur utilisé pour le scoring (mélange déclaré + observé, simple)
  // On utilise le déclaré comme base et on laisse computeAffinityScore mélanger l'observé.
  const scoringVector = profile.declaredPersonality;

  for (const archetype of taxonomy) {
    // ── Filtres durs ──────────────────────────────────────────────────────
    if (profile.excludeArchetypeIds.includes(archetype.id)) {
      excludedReasons.set(archetype.id, 'reroll-excluded');
      continue;
    }
    if (recentlyServedIds.has(archetype.id)) {
      excludedReasons.set(archetype.id, 'served-recently');
      continue;
    }
    if (archetype.requiresOutdoor && (!profile.hasUserLocation || !profile.isOutdoorFriendly)) {
      excludedReasons.set(archetype.id, 'outdoor-not-allowed');
      continue;
    }
    if (profile.instantOnly && archetype.questPace !== 'instant') {
      excludedReasons.set(archetype.id, 'planned-but-instant-only');
      continue;
    }

    // ── Score doux ────────────────────────────────────────────────────────
    const affinity = computeAffinityScore(scoringVector, archetype, {
      exhibited: profile.exhibitedPersonality,
      exhibitedWeight: phaseExhibitedWeight(profile),
    });
    const phaseFit = computePhaseFit(archetype, profile.phase, scoringVector);
    const freshness = computeFreshnessScore(archetype, profile.recentLogs, taxonomyById);
    const refinementBias = profile.refinementBias[archetype.category] ?? 0;
    const packBias = profile.questPackBias?.[archetype.category] ?? 0;
    // Refinement est dans [-0.14, +0.14] ; questPackBias saturé à ±0.18 côté shop.
    // On les additionne puis on saturait à ±0.30 avant de centrer à 0.5.
    const combinedBias = Math.max(-0.3, Math.min(0.3, refinementBias + packBias));
    const refinement = Math.max(0, Math.min(1, 0.5 + combinedBias * 3));

    const baseTotal =
      affinity * weights.affinity +
      phaseFit * weights.phaseFit +
      freshness * weights.freshness +
      refinement * weights.refinement;

    const feedbackPenalty = computeArchetypeFeedbackPenalty(archetype.id, profile.recentLogs);
    const mobilityPlannerMul = heavyQuestScoreMultiplier(profile.heavyQuestPreference, archetype);
    const total = baseTotal * feedbackPenalty * mobilityPlannerMul;

    const score: CandidateScore = { affinity, phaseFit, freshness, refinement, total };
    scored.push({
      archetype,
      score,
      reason: buildReason(score, archetype),
    });
  }

  // Tri principal par score décroissant ; tie-break stable
  const seed = options.selectionSeed ?? '';
  scored.sort((a, b) => {
    const diff = b.score.total - a.score.total;
    if (Math.abs(diff) > 0.001) return diff;
    if (seed) {
      const ja = stableJitter(seed, a.archetype.id);
      const jb = stableJitter(seed, b.archetype.id);
      if (ja !== jb) return jb - ja;
    }
    return a.archetype.id - b.archetype.id;
  });

  // Diversité catégorielle : un pool de 5 ne doit pas contenir 4 archétypes de la
  // même catégorie (sinon le LLM choisit dans un quasi-mono-choix et l'user sent
  // la répétition). On autorise au plus `MAX_PER_CATEGORY` par catégorie dans le
  // top-N, en basculant les suivants plus bas (sans les retirer).
  const diversifiedPool = pickDiversePool(scored, poolSize, MAX_PER_CATEGORY);

  return {
    candidates: diversifiedPool,
    allScored: scored,
    excludedReasons,
  };
}

/** Max d'archétypes d'une même catégorie dans le pool final (garantit diversité). */
const MAX_PER_CATEGORY = 2;

function pickDiversePool(
  sortedScored: QuestCandidate[],
  size: number,
  maxPerCat: number,
): QuestCandidate[] {
  const picked: QuestCandidate[] = [];
  const leftover: QuestCandidate[] = [];
  const perCat = new Map<string, number>();
  for (const c of sortedScored) {
    const cat = c.archetype.category;
    const count = perCat.get(cat) ?? 0;
    if (picked.length < size && count < maxPerCat) {
      picked.push(c);
      perCat.set(cat, count + 1);
    } else {
      leftover.push(c);
    }
  }
  // Si on n'a pas atteint `size` à cause du plafond (ex. pool très petit, une seule
  // catégorie qui match), on complète avec les leftover pour garantir la taille.
  while (picked.length < size && leftover.length) {
    picked.push(leftover.shift()!);
  }
  return picked;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function phaseExhibitedWeight(profile: ProfileSnapshot): number {
  // En calibration on s'appuie surtout sur le déclaré ; en rupture on fait plus confiance à l'observé.
  switch (profile.phase) {
    case 'calibration':
      return 0.2;
    case 'expansion':
      return 0.35;
    case 'rupture':
      return 0.45;
  }
}

function collectRecentlyServedIds(
  logs: ScoringQuestLog[],
  windowDays: number,
  todayIso?: string,
): Set<number> {
  const out = new Set<number>();
  if (!todayIso) {
    // Sans date de référence, on prend les N derniers logs (proxy)
    for (const log of logs.slice(0, windowDays)) out.add(log.archetypeId);
    return out;
  }
  const refMs = Date.parse(`${todayIso}T12:00:00.000Z`);
  if (Number.isNaN(refMs)) return out;
  const cutoff = refMs - windowDays * 86_400_000;
  for (const log of logs) {
    if (!log.questDate) continue;
    const ms = Date.parse(`${log.questDate}T12:00:00.000Z`);
    if (Number.isNaN(ms)) continue;
    if (ms >= cutoff) out.add(log.archetypeId);
  }
  return out;
}

function stableJitter(seed: string, id: number): number {
  // FNV-1a léger, suffisant pour départager les ex-aequo
  let h = 2166136261 >>> 0;
  const input = `${seed}|${id}`;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return (h % 1000) / 1000;
}

function buildReason(score: CandidateScore, archetype: QuestModel): string {
  const parts: string[] = [];
  if (score.affinity >= 0.7) parts.push('strong personality fit');
  else if (score.affinity >= 0.55) parts.push('decent fit');
  if (score.freshness >= 0.85) parts.push('fresh angle');
  if (score.phaseFit >= 0.85) parts.push('right intensity');
  if (score.refinement >= 0.65) parts.push('matches stated preferences');
  if (parts.length === 0) parts.push('balanced choice');
  return `${parts.join(', ')} (${archetype.category})`;
}
