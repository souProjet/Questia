import { PersonalityVector, OperationalQuadrant } from '../types';

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
export const ACTIVITY_PERSONALITY_CORRELATION: Record<string, Partial<PersonalityVector>> = {
  spatial_adventure:        { openness: 0.9, extraversion: 0.5, emotionalStability: 0.6, thrillSeeking: 0.95 },
  public_introspection:     { openness: 0.6, emotionalStability: 0.7, extraversion: -0.2, conscientiousness: 0.3 },
  sensory_deprivation:      { openness: 0.5, emotionalStability: 0.5, extraversion: -0.4, conscientiousness: 0.4 },
  exploratory_sociability:  { openness: 0.7, extraversion: 0.8, agreeableness: 0.6, thrillSeeking: 0.5 },
  physical_existential:     { openness: 0.6, conscientiousness: 0.5, emotionalStability: 0.3 },
  async_discipline:         { conscientiousness: 0.9, emotionalStability: 0.4, extraversion: -0.3 },
  dopamine_detox:           { conscientiousness: 0.8, emotionalStability: 0.6, boredomSusceptibility: -0.7 },
  active_empathy:           { extraversion: 0.85, agreeableness: 0.8, openness: 0.4 },
  temporal_projection:      { openness: 0.5, conscientiousness: 0.6, emotionalStability: 0.3 },
  hostile_immersion:        { extraversion: 0.9, emotionalStability: 0.7, thrillSeeking: 0.8 },
  spontaneous_altruism:     { agreeableness: 0.7, extraversion: 0.6, openness: 0.3 },
  relational_vulnerability: { agreeableness: 0.7, emotionalStability: 0.5, extraversion: 0.3 },
  unconditional_service:    { agreeableness: 0.8, conscientiousness: 0.6, extraversion: 0.1 },
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
