import type { PersonalityVector, OperationalQuadrant, PsychologicalCategory } from '../types';

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
