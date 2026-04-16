// Big Five personality traits
export interface BigFiveVector {
  openness: number;        // Ouverture à l'expérience (0-1)
  conscientiousness: number; // Consciencieusité (0-1)
  extraversion: number;    // Extraversion (0-1)
  agreeableness: number;   // Agréabilité (0-1)
  emotionalStability: number; // Stabilité émotionnelle (0-1)
}

// Sensation Seeking subscales
export interface SensationSeekingVector {
  thrillSeeking: number;     // Recherche de sensations fortes (0-1)
  boredomSusceptibility: number; // Susceptibilité à l'ennui (0-1)
}

// Combined personality profile
export interface PersonalityVector extends BigFiveVector, SensationSeekingVector {}

// Operational quadrant from onboarding (2 questions)
export type ExplorerAxis = 'homebody' | 'explorer'; // Casanier vs Explorateur
export type RiskAxis = 'cautious' | 'risktaker';     // Prudence vs Risque

/** 3rd optional onboarding question — refines extraversion & agreeableness. */
export type SociabilityLevel = 'solitary' | 'balanced' | 'social';

export interface OperationalQuadrant {
  explorerAxis: ExplorerAxis;
  riskAxis: RiskAxis;
}

// Psychological category for quests
export type PsychologicalCategory =
  | 'spatial_adventure'
  | 'public_introspection'
  | 'sensory_deprivation'
  | 'exploratory_sociability'
  | 'physical_existential'
  | 'async_discipline'
  | 'dopamine_detox'
  | 'active_empathy'
  | 'temporal_projection'
  | 'hostile_immersion'
  | 'spontaneous_altruism'
  | 'relational_vulnerability'
  | 'unconditional_service';

// Comfort zone exit level
export type ComfortLevel = 'low' | 'moderate' | 'high' | 'extreme';

/** Rythme d'archétype : faisable dans la journée vs à planifier (social, longue durée, etc.) */
export type QuestPace = 'instant' | 'planned';

/** Langue d'affichage / génération côté app (taxonomie + IA). */
export type AppLocale = 'fr' | 'en';

// Quest model (entrée de la taxonomie des quêtes)
export interface QuestModel {
  id: number;
  title: string;
  description: string;
  /** Même archétype, libellés EN (taxonomie). */
  titleEn: string;
  descriptionEn: string;
  category: PsychologicalCategory;
  targetTraits: Partial<BigFiveVector>;
  comfortLevel: ComfortLevel;
  requiresOutdoor: boolean;
  requiresSocial: boolean;
  minimumDurationMinutes: number;
  fallbackQuestId?: number;
  /** Dérivé de la taxonomie (social ou durée longue → planned) */
  questPace: QuestPace;
}

// Escalation phases
export type EscalationPhase = 'calibration' | 'expansion' | 'rupture';

// User profile stored in DB
export interface UserProfile {
  id: string;
  quadrant: OperationalQuadrant;
  declaredPersonality: PersonalityVector;  // p_r (from onboarding)
  exhibitedPersonality: PersonalityVector; // p_ex (computed from behavior)
  currentDay: number;
  currentPhase: EscalationPhase;
  congruenceDelta: number;
  streakCount: number;
  rerollsRemaining: number;
  createdAt: string;
  updatedAt: string;
}

// Quest log entry
export interface QuestLog {
  id: string;
  userId: string;
  questId: number;
  assignedAt: string;
  /** YYYY-MM-DD calendar date of the quest (used for recency filtering). */
  questDate?: string;
  status: 'pending' | 'accepted' | 'completed' | 'rejected' | 'replaced' | 'abandoned';
  completedAt?: string;
  congruenceDeltaAtAssignment: number;
  phaseAtAssignment: EscalationPhase;
  wasRerolled: boolean;
  wasFallback: boolean;
  safetyConsentGiven: boolean;
}

// Weather check result
export interface WeatherCheck {
  safe: boolean;
  temperature: number;
  alerts: string[];
  windSpeed: number;
  precipitation: number;
}

// AI generation request
export interface QuestNarrationRequest {
  anonymizedProfile: {
    quadrant: OperationalQuadrant;
    phase: EscalationPhase;
    congruenceDelta: number;
    dayNumber: number;
  };
  questModel: QuestModel;
}

// AI generation response
export interface QuestNarrationResponse {
  title: string;
  narrative: string;
  motivationalHook: string;
  estimatedDuration: string;
  safetyReminders: string[];
}
