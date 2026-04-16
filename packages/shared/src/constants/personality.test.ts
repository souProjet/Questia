import { describe, it, expect } from 'vitest';
import {
  QUADRANT_DEFAULTS,
  PERSONALITY_KEYS,
  applySociabilityAdjustment,
  isValidSociabilityLevel,
  softUpdateDeclaredPersonality,
} from './personality';
import type { PersonalityVector, PsychologicalCategory } from '../types';

describe('applySociabilityAdjustment', () => {
  const base = QUADRANT_DEFAULTS['explorer_risktaker'];

  it('returns base unchanged for "balanced"', () => {
    expect(applySociabilityAdjustment(base, 'balanced')).toEqual(base);
  });

  it('returns base unchanged when level is null/undefined', () => {
    expect(applySociabilityAdjustment(base, null)).toEqual(base);
    expect(applySociabilityAdjustment(base, undefined)).toEqual(base);
  });

  it('decreases extraversion for "solitary"', () => {
    const result = applySociabilityAdjustment(base, 'solitary');
    expect(result.extraversion).toBeLessThan(base.extraversion);
    expect(result.agreeableness).toBeLessThan(base.agreeableness);
  });

  it('increases extraversion for "social"', () => {
    const result = applySociabilityAdjustment(base, 'social');
    expect(result.extraversion).toBeGreaterThan(base.extraversion);
    expect(result.agreeableness).toBeGreaterThan(base.agreeableness);
  });

  it('clamps all traits between 0 and 1', () => {
    const extreme: PersonalityVector = {
      openness: 0.02,
      conscientiousness: 0.02,
      extraversion: 0.02,
      agreeableness: 0.02,
      emotionalStability: 0.02,
      thrillSeeking: 0.02,
      boredomSusceptibility: 0.02,
    };
    const result = applySociabilityAdjustment(extreme, 'solitary');
    for (const k of PERSONALITY_KEYS) {
      expect(result[k]).toBeGreaterThanOrEqual(0);
      expect(result[k]).toBeLessThanOrEqual(1);
    }
  });

  it('does not mutate the original base vector', () => {
    const clone = { ...base };
    applySociabilityAdjustment(base, 'social');
    expect(base).toEqual(clone);
  });
});

describe('isValidSociabilityLevel', () => {
  it('accepts valid levels', () => {
    expect(isValidSociabilityLevel('solitary')).toBe(true);
    expect(isValidSociabilityLevel('balanced')).toBe(true);
    expect(isValidSociabilityLevel('social')).toBe(true);
  });

  it('rejects invalid values', () => {
    expect(isValidSociabilityLevel('unknown')).toBe(false);
    expect(isValidSociabilityLevel(42)).toBe(false);
    expect(isValidSociabilityLevel(null)).toBe(false);
    expect(isValidSociabilityLevel(undefined)).toBe(false);
  });
});

describe('softUpdateDeclaredPersonality', () => {
  const declared = QUADRANT_DEFAULTS['homebody_cautious'];
  const category: PsychologicalCategory = 'exploratory_sociability';

  it('returns adjusted vector for accept on day 1', () => {
    const result = softUpdateDeclaredPersonality(declared, category, 'accepted', 1);
    expect(result).not.toBeNull();
    expect(result!.extraversion).not.toEqual(declared.extraversion);
  });

  it('returns null when day exceeds SOFT_UPDATE_MAX_DAY', () => {
    expect(softUpdateDeclaredPersonality(declared, category, 'accepted', 6)).toBeNull();
    expect(softUpdateDeclaredPersonality(declared, category, 'accepted', 100)).toBeNull();
  });

  it('shifts positively on accept/complete', () => {
    const accepted = softUpdateDeclaredPersonality(declared, category, 'accepted', 3);
    expect(accepted).not.toBeNull();
    expect(accepted!.extraversion).toBeGreaterThan(declared.extraversion);
  });

  it('shifts negatively on reject/abandon', () => {
    const rejected = softUpdateDeclaredPersonality(declared, category, 'rejected', 2);
    expect(rejected).not.toBeNull();
    expect(rejected!.extraversion).toBeLessThan(declared.extraversion);
  });

  it('clamps results to [0, 1]', () => {
    const result = softUpdateDeclaredPersonality(declared, category, 'completed', 1);
    if (result) {
      for (const k of PERSONALITY_KEYS) {
        expect(result[k]).toBeGreaterThanOrEqual(0);
        expect(result[k]).toBeLessThanOrEqual(1);
      }
    }
  });

  it('does not mutate the original vector', () => {
    const clone = { ...declared };
    softUpdateDeclaredPersonality(declared, category, 'accepted', 1);
    expect(declared).toEqual(clone);
  });

  it('returns null for unknown category', () => {
    const result = softUpdateDeclaredPersonality(declared, 'nonexistent' as PsychologicalCategory, 'accepted', 1);
    expect(result).toBeNull();
  });
});
