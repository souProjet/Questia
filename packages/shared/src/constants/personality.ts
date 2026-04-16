import type { PersonalityVector, OperationalQuadrant, PsychologicalCategory, SociabilityLevel } from '../types';

/**
 * Default personality vectors for each operational quadrant.
 * Derived from TIPI/SSS mapping to Big Five + Sensation Seeking.
 */
export const QUADRANT_DEFAULTS: Record<
  `${OperationalQuadrant['explorerAxis']}_${OperationalQuadrant['riskAxis']}`,
  PersonalityVector
> = {
  homebody_cautious: {
    openness: 0.25,
    conscientiousness: 0.7,
    extraversion: 0.2,
    agreeableness: 0.65,
    emotionalStability: 0.4,
    thrillSeeking: 0.15,
    boredomSusceptibility: 0.3,
  },
  homebody_risktaker: {
    openness: 0.5,
    conscientiousness: 0.45,
    extraversion: 0.35,
    agreeableness: 0.5,
    emotionalStability: 0.6,
    thrillSeeking: 0.65,
    boredomSusceptibility: 0.7,
  },
  explorer_cautious: {
    openness: 0.7,
    conscientiousness: 0.65,
    extraversion: 0.6,
    agreeableness: 0.6,
    emotionalStability: 0.55,
    thrillSeeking: 0.4,
    boredomSusceptibility: 0.5,
  },
  explorer_risktaker: {
    openness: 0.9,
    conscientiousness: 0.4,
    extraversion: 0.85,
    agreeableness: 0.5,
    emotionalStability: 0.7,
    thrillSeeking: 0.9,
    boredomSusceptibility: 0.85,
  },
};

/**
 * Correlation matrix C mapping activity categories to personality traits.
 * Each row represents a quest psychological category, each column a Big Five trait.
 * Values from -1 to 1 indicate how strongly completing that activity type
 * suggests the corresponding personality trait.
 */
export const ACTIVITY_PERSONALITY_CORRELATION: Record<PsychologicalCategory, Partial<PersonalityVector>> = {
  spatial_adventure:        { openness: 0.9,  conscientiousness: 0.2,  extraversion: 0.5,  agreeableness: 0.15, emotionalStability: 0.6,  thrillSeeking: 0.95, boredomSusceptibility: 0.6  },
  public_introspection:     { openness: 0.6,  conscientiousness: 0.3,  extraversion: -0.2, agreeableness: 0.3,  emotionalStability: 0.7,  thrillSeeking: -0.1, boredomSusceptibility: -0.2 },
  sensory_deprivation:      { openness: 0.5,  conscientiousness: 0.4,  extraversion: -0.4, agreeableness: 0.2,  emotionalStability: 0.5,  thrillSeeking: -0.2, boredomSusceptibility: -0.4 },
  exploratory_sociability:  { openness: 0.7,  conscientiousness: 0.2,  extraversion: 0.8,  agreeableness: 0.6,  emotionalStability: 0.35, thrillSeeking: 0.5,  boredomSusceptibility: 0.4  },
  physical_existential:     { openness: 0.6,  conscientiousness: 0.5,  extraversion: 0.15, agreeableness: 0.2,  emotionalStability: 0.3,  thrillSeeking: 0.3,  boredomSusceptibility: 0.1  },
  async_discipline:         { openness: 0.1,  conscientiousness: 0.9,  extraversion: -0.3, agreeableness: 0.25, emotionalStability: 0.4,  thrillSeeking: -0.2, boredomSusceptibility: -0.5 },
  dopamine_detox:           { openness: 0.15, conscientiousness: 0.8,  extraversion: -0.2, agreeableness: 0.3,  emotionalStability: 0.6,  thrillSeeking: -0.3, boredomSusceptibility: -0.7 },
  active_empathy:           { openness: 0.4,  conscientiousness: 0.3,  extraversion: 0.85, agreeableness: 0.8,  emotionalStability: 0.4,  thrillSeeking: 0.2,  boredomSusceptibility: 0.15 },
  temporal_projection:      { openness: 0.5,  conscientiousness: 0.6,  extraversion: 0.05, agreeableness: 0.25, emotionalStability: 0.3,  thrillSeeking: 0.05, boredomSusceptibility: -0.15 },
  hostile_immersion:        { openness: 0.5,  conscientiousness: 0.2,  extraversion: 0.9,  agreeableness: 0.15, emotionalStability: 0.7,  thrillSeeking: 0.8,  boredomSusceptibility: 0.5  },
  spontaneous_altruism:     { openness: 0.3,  conscientiousness: 0.35, extraversion: 0.82, agreeableness: 0.7,  emotionalStability: 0.4,  thrillSeeking: 0.15, boredomSusceptibility: 0.1  },
  relational_vulnerability: { openness: 0.45, conscientiousness: 0.35, extraversion: 0.3,  agreeableness: 0.7,  emotionalStability: 0.5,  thrillSeeking: 0.1,  boredomSusceptibility: -0.1 },
  unconditional_service:    { openness: 0.25, conscientiousness: 0.6,  extraversion: 0.1,  agreeableness: 0.8,  emotionalStability: 0.45, thrillSeeking: -0.1, boredomSusceptibility: -0.2 },
};

export const PERSONALITY_KEYS: (keyof PersonalityVector)[] = [
  'openness',
  'conscientiousness',
  'extraversion',
  'agreeableness',
  'emotionalStability',
  'thrillSeeking',
  'boredomSusceptibility',
];

// ── Sociability adjustment (3rd onboarding question) ────────────────────────

const SOCIABILITY_DELTA: Record<SociabilityLevel, Partial<PersonalityVector>> = {
  solitary: {
    extraversion: -0.15,
    agreeableness: -0.08,
    boredomSusceptibility: -0.06,
  },
  balanced: {},
  social: {
    extraversion: 0.12,
    agreeableness: 0.10,
    boredomSusceptibility: 0.05,
  },
};

const VALID_SOCIABILITY: SociabilityLevel[] = ['solitary', 'balanced', 'social'];

export function isValidSociabilityLevel(v: unknown): v is SociabilityLevel {
  return typeof v === 'string' && VALID_SOCIABILITY.includes(v as SociabilityLevel);
}

/**
 * Applies the sociability adjustment to a base quadrant vector.
 * Each adjusted trait is clamped to [0, 1].
 * If level is 'balanced' or undefined, the base vector is returned unchanged.
 */
export function applySociabilityAdjustment(
  base: PersonalityVector,
  level: SociabilityLevel | undefined | null,
): PersonalityVector {
  if (!level || level === 'balanced') return base;
  const delta = SOCIABILITY_DELTA[level];
  if (!delta) return base;
  const out = { ...base };
  for (const key of PERSONALITY_KEYS) {
    const d = delta[key];
    if (d !== undefined) {
      out[key] = Math.max(0, Math.min(1, base[key] + d));
    }
  }
  return out;
}

// ── Soft update of declared personality (first 5 days) ──────────────────────

const SOFT_UPDATE_MAX_DAY = 5;
const SOFT_UPDATE_ACCEPT_WEIGHT = 0.03;
const SOFT_UPDATE_REJECT_WEIGHT = -0.05;

/**
 * Gently adjusts `declaredPersonality` based on the user's reaction to a quest
 * during the first days of use. This lets the profile converge toward the
 * "real" personality faster than waiting for the refinement questionnaire.
 *
 * - accept/complete: small positive shift toward the quest's category correlation
 * - reject/abandon: small negative shift away from the category correlation
 *
 * Returns null if no update should be applied (day too high, unknown category, etc.).
 */
export function softUpdateDeclaredPersonality(
  declared: PersonalityVector,
  category: PsychologicalCategory,
  reaction: 'accepted' | 'completed' | 'rejected' | 'abandoned',
  currentDay: number,
): PersonalityVector | null {
  if (currentDay > SOFT_UPDATE_MAX_DAY) return null;

  const correlation = ACTIVITY_PERSONALITY_CORRELATION[category];
  if (!correlation) return null;

  const weight =
    reaction === 'accepted' || reaction === 'completed'
      ? SOFT_UPDATE_ACCEPT_WEIGHT
      : SOFT_UPDATE_REJECT_WEIGHT;

  const out = { ...declared };
  let changed = false;
  for (const key of PERSONALITY_KEYS) {
    const c = correlation[key];
    if (c === undefined) continue;
    const shift = weight * c;
    const prev = out[key];
    out[key] = Math.max(0, Math.min(1, prev + shift));
    if (out[key] !== prev) changed = true;
  }
  return changed ? out : null;
}
