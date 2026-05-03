import { describe, expect, it } from 'vitest';
import { computeWebAuraColors } from './auraColors';

const fullVector = {
  openness: 0.8,
  conscientiousness: 0.2,
  extraversion: 0.5,
  agreeableness: 0.4,
  emotionalStability: 0.6,
  thrillSeeking: 0.3,
  boredomSusceptibility: 0.7,
};

describe('computeWebAuraColors', () => {
  it('retourne null sans personnalité', () => {
    expect(computeWebAuraColors(null, null)).toBeNull();
    expect(computeWebAuraColors(undefined, 'midnight')).toBeNull();
  });

  it('retourne trois couleurs rgba pour thème clair', () => {
    const c = computeWebAuraColors(fullVector, undefined);
    expect(c).not.toBeNull();
    expect(c!.tr).toMatch(/^rgba\(\d+,\d+,\d+,\d+\.\d+\)$/);
    expect(c!.bl).toMatch(/^rgba\(/);
    expect(c!.tl).toMatch(/^rgba\(/);
  });

  it('thème midnight : alpha et teintes distinctes', () => {
    const light = computeWebAuraColors(fullVector, 'default');
    const midnight = computeWebAuraColors(fullVector, 'midnight');
    expect(light).not.toBeNull();
    expect(midnight).not.toBeNull();
    expect(light!.tr).not.toBe(midnight!.tr);
  });

  it('couvre les branches hsl (teintes extrêmes)', () => {
    const edge = {
      ...fullVector,
      extraversion: 0.01,
      thrillSeeking: 0.99,
      openness: 0.99,
      agreeableness: 0,
      emotionalStability: 0,
      conscientiousness: 0.99,
    };
    const c = computeWebAuraColors(edge, null);
    expect(c?.tr).toMatch(/^rgba\(/);
  });
});
