import type {
  ComfortLevel,
  EscalationPhase,
  PersonalityVector,
  PsychologicalCategory,
  QuestLog,
  QuestModel,
  SociabilityLevel,
} from '../types';
import type { HeavyQuestPreference } from '../profilePreferences';

/**
 * Snapshot d'un profil utilisateur tel que vu par le moteur de sélection.
 *
 * Contient tout ce dont l'algorithme a besoin pour scorer les archétypes,
 * sans dépendance au schéma Prisma : permet de tester le moteur sans BDD
 * et de refactorer la persistance sans toucher à l'algo.
 */
export interface ProfileSnapshot {
  /** Vecteur déclaré à l'onboarding (avec ajustement sociabilité éventuel). */
  declaredPersonality: PersonalityVector;
  /** Vecteur observé depuis l'historique. */
  exhibitedPersonality: PersonalityVector;
  /** Δ entre les deux (0 = aligné, 1 = très divergent). */
  congruenceDelta: number;
  /** Phase effective (avec downgrade/upscale appliqués). */
  phase: EscalationPhase;
  /** Jour de parcours (1-indexed). */
  day: number;
  /** Sociabilité explicite (3ᵉ question d'onboarding). */
  sociability: SociabilityLevel | null;
  /** Biais issu du questionnaire de raffinement (positif = favorise). */
  refinementBias: Partial<Record<PsychologicalCategory, number>>;
  /**
   * Biais issu des packs de quêtes possédés (saturé côté `questPackBiasFromOwned`).
   * Cohabite avec `refinementBias` : les deux s'additionnent dans le scoring.
   */
  questPackBias?: Partial<Record<PsychologicalCategory, number>>;
  /** Logs récents (du plus récent au plus ancien). */
  recentLogs: ScoringQuestLog[];
  /** True si l'utilisateur a accepté de partager sa position GPS. */
  hasUserLocation: boolean;
  /** True si la météo permet une quête en extérieur. */
  isOutdoorFriendly: boolean;
  /** Si > 0, on cherche uniquement des quêtes « instant » (après report). */
  instantOnly: boolean;
  /**
   * Fréquence souhaitée pour quêtes extérieures ou « à caler / organiser » (planifié).
   * Surcharge douce du score — pas un filtre dur (évite de vider le pool).
   */
  heavyQuestPreference?: HeavyQuestPreference;
  /** Archétypes à exclure (proposés récemment, relances cumulées du jour). */
  excludeArchetypeIds: number[];
}

/** Forme allégée de QuestLog pour le moteur (n'a pas besoin de tous les champs Prisma). */
export interface ScoringQuestLog {
  archetypeId: number;
  status: QuestLog['status'];
  /** YYYY-MM-DD — utilisé pour la fenêtre de fraîcheur. */
  questDate: string | null;
}

/** Score détaillé d'un candidat — utile pour debug, logs, et explainability. */
export interface CandidateScore {
  /** Affinité profil ↔ archétype (0 = neutre, 1 = très aligné). */
  affinity: number;
  /** Adéquation phase ↔ confort/durée (0 = trop dur ou trop fade, 1 = parfait). */
  phaseFit: number;
  /** Fraîcheur : 1 = catégorie peu vue récemment, 0 = saturée. */
  freshness: number;
  /** Préférence raffinement (centrée à 0.5 = neutre). */
  refinement: number;
  /** Score final pondéré ∈ [0, 1]. */
  total: number;
}

/** Candidat retenu pour passer au LLM. */
export interface QuestCandidate {
  archetype: QuestModel;
  score: CandidateScore;
  /** Raison principale (1 ligne) — exposée à l'IA pour orientation. */
  reason: string;
}

/**
 * Sortie du moteur « full-gen » : contraintes créatives du jour (plus de top-N d'archétypes).
 * La taxonomie sert d'inspiration (thèmes) et de pool de fallback déterministe.
 */
export interface QuestParameters {
  primaryCategory: PsychologicalCategory;
  /** Autres familles bien classées après la primaire (ordre décroissant). */
  secondaryCategories: PsychologicalCategory[];
  /** Intensité / zone de confort cible (phase + profil). */
  targetComfort: ComfortLevel;
  /** Durée cible en minutes (bornes profil + phase). */
  idealDurationMinutes: number;
  /** Quelques entrées taxonomie pour inspiration uniquement (titres / concepts courts). */
  themeInspirations: QuestModel[];
  /** Archétypes éligibles pour tirage de secours dans la famille du jour. */
  fallbackArchetypePool: QuestModel[];
  /** Meilleur archétype scoré dans la catégorie primaire (référence, XP, debug). */
  primaryChampion: QuestCandidate;
  /** Ordre des familles par score (la primaire en tête). */
  rankedCategories: PsychologicalCategory[];
  /** Tous les archétypes scorés après filtres durs (diagnostic). */
  allScored: QuestCandidate[];
  saturatedCategories: PsychologicalCategory[];
  excludedReasons: Map<number, string>;
}

/** Pondération entre les composantes du score final. La somme doit faire 1. */
export interface ScoreWeights {
  affinity: number;
  phaseFit: number;
  freshness: number;
  refinement: number;
}

export const DEFAULT_SCORE_WEIGHTS: ScoreWeights = Object.freeze({
  affinity: 0.38,
  phaseFit: 0.25,
  freshness: 0.27,
  refinement: 0.10,
});

/** Nombre de candidats max envoyés au LLM (le LLM choisit le plus pertinent). */
export const DEFAULT_CANDIDATE_POOL_SIZE = 5;

/** Nombre de jours pendant lesquels un archétype servi est ignoré. */
export const DEFAULT_RECENT_EXCLUSION_DAYS = 7;
