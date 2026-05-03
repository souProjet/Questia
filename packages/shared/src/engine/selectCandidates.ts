import type { EscalationPhase, PersonalityVector, PsychologicalCategory, QuestModel } from '../types';
import { archetypeNeedsTravelOrPlanning } from '../constants/quests';
import { computeGentleness } from './congruence';
import { computeAffinityScore } from './affinity';
import { computeArchetypeFeedbackPenalty, computeFreshnessScore, listSaturatedCategories } from './freshness';
import { computePhaseFit, computeTargetComfortLevel } from './phaseFit';
import { promptSeedIndex, pickDeterministicFromPool } from './promptSeed';
import {
  DEFAULT_RECENT_EXCLUSION_DAYS,
  DEFAULT_SCORE_WEIGHTS,
  type CandidateScore,
  type ProfileSnapshot,
  type QuestCandidate,
  type QuestParameters,
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

export interface BuildQuestParametersOptions {
  /** Graine déterministe pour départages stables (catégories / inspiration). */
  selectionSeed?: string;
  /** Date du jour (ISO YYYY-MM-DD) pour la fenêtre d'exclusion d'archétypes servis. */
  todayIso?: string;
  /** Fenêtre d'exclusion (jours) pour les archétypes récemment servis (défaut : 7). */
  recentExclusionDays?: number;
  /** Pondération des composantes du score (défaut : DEFAULT_SCORE_WEIGHTS). */
  weights?: ScoreWeights;
  /** Nombre d'exemples taxonomie à proposer au LLM comme simple inspiration (défaut : 3). */
  themeInspirationCount?: number;
  /** Borne basse durée quête (minutes) — profil utilisateur. */
  questDurationMinMinutes: number;
  /** Borne haute durée quête (minutes) — profil utilisateur. */
  questDurationMaxMinutes: number;
}

export interface BuildQuestParametersResult {
  params: QuestParameters;
  /** Candidats scorés après filtre dur « durée dans les bornes » quand il reste au moins un résultat. */
  scoredForAggregation: QuestCandidate[];
}

/**
 * Moteur de contexte : déduit famille psychologique cible, intensité, durée idéale,
 * exemples d'inspiration taxonomie et pool de fallback — sans imposer un archétype au LLM.
 *
 * Le scoring par archétype (affinity, phaseFit, freshness, refinement) sert à **classer les familles**
 * ; le champion d'une famille est l'archétype le mieux noté dans cette famille.
 */
export function buildQuestParameters(
  taxonomy: QuestModel[],
  profile: ProfileSnapshot,
  options: BuildQuestParametersOptions,
): BuildQuestParametersResult | null {
  const weights = options.weights ?? DEFAULT_SCORE_WEIGHTS;
  const recentDays = options.recentExclusionDays ?? DEFAULT_RECENT_EXCLUSION_DAYS;
  const themeN = Math.max(1, options.themeInspirationCount ?? 3);
  const dMin = Math.max(1, options.questDurationMinMinutes);
  const dMax = Math.max(dMin, options.questDurationMaxMinutes);

  const taxonomyById = new Map<number, QuestModel>(taxonomy.map((q) => [q.id, q]));

  const recentlyServedIds = collectRecentlyServedIds(
    profile.recentLogs,
    recentDays,
    options.todayIso,
  );

  const excludedReasons = new Map<number, string>();
  const scored: QuestCandidate[] = [];

  const scoringVector = profile.declaredPersonality;

  for (const archetype of taxonomy) {
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

    const affinity = computeAffinityScore(scoringVector, archetype, {
      exhibited: profile.exhibitedPersonality,
      exhibitedWeight: phaseExhibitedWeight(profile),
    });
    const phaseFit = computePhaseFit(archetype, profile.phase, scoringVector);
    const freshness = computeFreshnessScore(archetype, profile.recentLogs, taxonomyById);
    const refinementBias = profile.refinementBias[archetype.category] ?? 0;
    const packBias = profile.questPackBias?.[archetype.category] ?? 0;
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

  if (scored.length === 0) {
    return null;
  }

  // Comme la route API : si des archétypes matchent les bornes de durée profil, on restreint.
  const durationFiltered = scored.filter(
    (c) =>
      c.archetype.minimumDurationMinutes >= dMin && c.archetype.minimumDurationMinutes <= dMax,
  );
  const scoredForAggregation = durationFiltered.length > 0 ? durationFiltered : scored;

  const seed = options.selectionSeed ?? '';

  // Champion par famille psychologique
  const championByCategory = new Map<PsychologicalCategory, QuestCandidate>();
  for (const c of scoredForAggregation) {
    const cat = c.archetype.category;
    const prev = championByCategory.get(cat);
    if (!prev || c.score.total > prev.score.total) {
      championByCategory.set(cat, c);
    }
  }

  const categoryRows = [...championByCategory.entries()].map(([category, champion]) => ({
    category,
    champion,
  }));

  categoryRows.sort((a, b) => {
    const diff = b.champion.score.total - a.champion.score.total;
    if (Math.abs(diff) > 0.001) return diff;
    if (seed) {
      const ja = stableJitter(seed, a.category);
      const jb = stableJitter(seed, b.category);
      if (ja !== jb) return jb - ja;
    }
    return a.category.localeCompare(b.category);
  });

  const primary = categoryRows[0];
  if (!primary) return null;

  const rankedCategories = categoryRows.map((r) => r.category);
  const secondaryCategories = rankedCategories.slice(1, 4);

  const primaryCategory = primary.category;
  const primaryChampion = primary.champion;

  const targetComfort = computeTargetComfortLevel(profile.phase, scoringVector);
  const idealDurationMinutes = computeIdealDurationMinutes(profile.phase, dMin, dMax, scoringVector);

  const inPrimary = scoredForAggregation
    .filter((c) => c.archetype.category === primaryCategory)
    .sort((a, b) => {
      const diff = b.score.total - a.score.total;
      if (Math.abs(diff) > 0.001) return diff;
      if (seed) {
        const ja = stableJitter(seed, a.archetype.id);
        const jb = stableJitter(seed, b.archetype.id);
        if (ja !== jb) return jb - ja;
      }
      return a.archetype.id - b.archetype.id;
    });

  const themeInspirations = pickThemeInspirations(inPrimary, themeN, seed);

  const fallbackArchetypePool = inPrimary.map((c) => c.archetype);

  const saturatedCategories = listSaturatedCategories(profile.recentLogs, taxonomyById);

  const params: QuestParameters = {
    primaryCategory,
    secondaryCategories,
    targetComfort,
    idealDurationMinutes,
    themeInspirations,
    fallbackArchetypePool,
    primaryChampion,
    rankedCategories,
    allScored: scored,
    saturatedCategories,
    excludedReasons,
  };

  return { params, scoredForAggregation };
}

function pickThemeInspirations(
  sortedInPrimary: QuestCandidate[],
  n: number,
  seed: string,
): QuestModel[] {
  const out: QuestModel[] = [];
  const seen = new Set<number>();
  for (const c of sortedInPrimary) {
    if (out.length >= n) break;
    if (seen.has(c.archetype.id)) continue;
    seen.add(c.archetype.id);
    out.push(c.archetype);
  }
  if (out.length >= n || sortedInPrimary.length === 0) return out.slice(0, n);
  // Rare : pas assez de variantes — compléter avec jitter stable sur toute la liste triée
  let k = 0;
  while (out.length < n && k < sortedInPrimary.length * 3) {
    const idx =
      seed.length === 0
        ? out.length % sortedInPrimary.length
        : promptSeedIndex(`${seed}|theme`, `${k}`, sortedInPrimary.length);
    const arch = sortedInPrimary[idx]!.archetype;
    if (!seen.has(arch.id)) {
      seen.add(arch.id);
      out.push(arch);
    }
    k++;
  }
  return out.slice(0, n);
}

function computeIdealDurationMinutes(
  phase: EscalationPhase,
  dMin: number,
  dMax: number,
  scoringVector: PersonalityVector,
): number {
  const mid = (dMin + dMax) / 2;
  const gentleness = computeGentleness(scoringVector);
  let t = mid;
  if (phase === 'calibration') {
    t = dMin + (mid - dMin) * (0.35 + gentleness * 0.28);
  } else if (phase === 'rupture') {
    t = mid + (dMax - mid) * (0.38 + (1 - gentleness) * 0.32);
  } else {
    t = mid + (dMax - dMin) * (gentleness - 0.5) * 0.12;
  }
  const rounded = Math.round(t / 5) * 5;
  return Math.max(dMin, Math.min(dMax, rounded));
}

function phaseExhibitedWeight(profile: ProfileSnapshot): number {
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

function stableJitter(seed: string, id: string | number): number {
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

/**
 * Pour la persistance et les stats (congruence), associe une entrée taxonomie réelle
 * à la famille choisie — tirage déterministe dans le pool du jour.
 */
export function pickArchetypeIdForCategoryStorage(
  pool: QuestModel[],
  taxonomy: QuestModel[],
  category: PsychologicalCategory,
  seed: string,
): QuestModel {
  const scoped = pool.filter((a) => a.category === category);
  const source = scoped.length > 0 ? scoped : taxonomy.filter((a) => a.category === category);
  const pick = pickDeterministicFromPool(source, seed, 'stats-arch');
  if (pick) return pick;
  const fallback = taxonomy[0];
  if (!fallback) throw new Error('quest-engine: empty taxonomy');
  return fallback;
}

/**
 * Si tous les filtres durs ont vidé le moteur, construit des paramètres minimaux
 * à partir d'un archétype de secours (taxonomie).
 */
export function buildEmergencyQuestParameters(
  taxonomy: QuestModel[],
  archetype: QuestModel,
  profile: ProfileSnapshot,
  durationMin: number,
  durationMax: number,
): QuestParameters {
  const dMin = Math.max(1, durationMin);
  const dMax = Math.max(dMin, durationMax);
  const pool = taxonomy.filter((a) => a.category === archetype.category);
  const fallbackPool = pool.length > 0 ? pool : [archetype];
  const themeInspirations = fallbackPool.slice(0, Math.min(3, fallbackPool.length));
  const neutralScore: CandidateScore = {
    affinity: 0.5,
    phaseFit: 0.5,
    freshness: 1,
    refinement: 0.5,
    total: 0.5,
  };
  return {
    primaryCategory: archetype.category,
    secondaryCategories: [],
    targetComfort: computeTargetComfortLevel(profile.phase, profile.declaredPersonality),
    idealDurationMinutes: computeIdealDurationMinutes(profile.phase, dMin, dMax, profile.declaredPersonality),
    themeInspirations,
    fallbackArchetypePool: fallbackPool,
    primaryChampion: {
      archetype,
      score: neutralScore,
      reason: 'emergency taxonomy fallback',
    },
    rankedCategories: [archetype.category],
    allScored: [],
    saturatedCategories: [],
    excludedReasons: new Map(),
  };
}
