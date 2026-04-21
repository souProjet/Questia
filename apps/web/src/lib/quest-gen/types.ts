import type {
  AppLocale,
  EscalationPhase,
  ExplorerAxis,
  HeavyQuestPreference,
  PersonalityVector,
  QuestCandidate,
  RiskAxis,
  SociabilityLevel,
} from '@questia/shared';

/**
 * Tout ce que la pipeline LLM-first reçoit pour générer la quête du jour.
 *
 * Le LLM choisit lui-même le meilleur candidat et le rédige : pas de pré-décision
 * par l'algorithme. L'algorithme propose simplement un dossier de candidature
 * (top-N) et de la matière contextuelle riche.
 */
export interface QuestGenInput {
  /** Top-N candidats (avec scores et raison) — l'IA choisit le plus pertinent. */
  candidates: QuestCandidate[];
  /** Snapshot du profil utilisateur pour la génération. */
  profile: GenerationProfile;
  /** Contexte du jour (date, météo, lieu). */
  context: GenerationContext;
  /** Historique récent (5 dernières quêtes complétées/acceptées/rejetées). */
  history: GenerationHistoryItem[];
  /** Locale d'affichage. */
  locale: AppLocale;
  /** Graine déterministe pour reproductibilité (logs/tests). */
  generationSeed: string;
  /** Mode relance : exiger une variation marquée par rapport à la dernière proposition de la même journée. */
  isReroll?: boolean;
  /** Mode après report : exiger une quête 100% faisable aujourd'hui. */
  substitutedInstantAfterDefer?: boolean;
}

export interface GenerationProfile {
  declaredPersonality: PersonalityVector;
  exhibitedPersonality: PersonalityVector;
  congruenceDelta: number;
  phase: EscalationPhase;
  day: number;
  explorerAxis: ExplorerAxis;
  riskAxis: RiskAxis;
  sociability: SociabilityLevel | null;
  /** Texte libre issu du raffinement (préférences user) — null si non rempli. */
  refinementContext: string | null;
  /** Fréquence souhaitée pour quêtes déplacement / à organiser (extérieur ou planifié). */
  heavyQuestPreference?: HeavyQuestPreference;
}

export interface GenerationContext {
  questDateIso: string;
  city: string;
  country: string;
  weatherDescription: string;
  weatherIcon: string;
  temp: number;
  isOutdoorFriendly: boolean;
  hasUserLocation: boolean;
  /** Plage de durée souhaitée (minutes) — consigne pour le champ `duration` du JSON. */
  questDurationMinMinutes: number;
  questDurationMaxMinutes: number;
}

export interface GenerationHistoryItem {
  archetypeId: number;
  archetypeTitle: string;
  category: string;
  status: 'completed' | 'accepted' | 'rejected' | 'abandoned' | 'pending' | 'replaced';
  /** Titre généré par l'IA pour cette quête (peut différer du titre canon). */
  generatedTitle: string | null;
  /** Mission générée (1 phrase) — utile pour éviter la répétition stylistique. */
  generatedMission: string | null;
  /** Date ISO YYYY-MM-DD. */
  questDate: string | null;
}

/** Output structuré du LLM, après parsing + validation. */
export interface GeneratedQuest {
  /** Archétype choisi par le LLM (doit être dans la liste de candidats). */
  archetypeId: number;
  icon: string;
  title: string;
  /** Une seule phrase, action concrète. */
  mission: string;
  /** Punchline narrative courte. */
  hook: string;
  /** Durée humaine (ex. "30 min", "1h"). */
  duration: string;
  isOutdoor: boolean;
  safetyNote: string | null;
  destinationLabel: string | null;
  destinationQuery: string | null;
  /** Justification courte du choix par le LLM (debug/log). */
  selectionReason: string | null;
  /** Auto-évaluation 0-100 par le LLM (debug/observabilité, pas affiché). */
  selfFitScore: number | null;
  /** True si la pipeline a dû fallback sur le template archétype. */
  wasFallback: boolean;
}

/** Liste blanche des icônes Lucide acceptées (gardée du système précédent). */
export const QUEST_ICON_ALLOWLIST = new Set([
  'Swords',
  'Camera',
  'Coffee',
  'Mic',
  'Compass',
  'Sparkles',
  'TreePine',
  'MapPin',
  'Target',
  'BookOpen',
  'UtensilsCrossed',
  'Drama',
  'Leaf',
  'Navigation',
  'Flower',
]);

export const MISSION_MAX_CHARS = 300;
export const MISSION_MAX_WORDS = 48;
export const TITLE_MIN_CHARS = 3;
export const TITLE_MAX_CHARS = 90;
export const HOOK_MAX_WORDS = 24;
export const HOOK_MIN_CHARS = 6;
