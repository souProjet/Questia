import { describe, expect, it } from 'vitest';
import {
  archetypeBaseMultiplier,
  streakBonusFor,
  computeCompletionXp,
  levelFromTotalXp,
  XP_PER_LEVEL,
  XP_PER_QUEST_CAP,
  XP_STREAK_BONUS_CAP,
} from './xp';

describe('archetypeBaseMultiplier', () => {
  it('combine explorateur et preneur de risque', () => {
    expect(archetypeBaseMultiplier('explorer', 'risktaker')).toBeGreaterThan(1);
  });
  it('casanier prudent = base 1.0', () => {
    expect(archetypeBaseMultiplier('homebody', 'cautious')).toBe(1);
  });
});

describe('streakBonusFor', () => {
  it('plafonne le bonus série', () => {
    expect(streakBonusFor(100)).toBe(XP_STREAK_BONUS_CAP);
  });
  it('0 si série 0', () => {
    expect(streakBonusFor(0)).toBe(0);
  });
});

describe('computeCompletionXp', () => {
  it('applique extérieur, fallback et relance', () => {
    const a = computeCompletionXp({
      phaseAtAssignment: 'rupture',
      streakCount: 2,
      isOutdoor: true,
      explorerAxis: 'explorer',
      riskAxis: 'risktaker',
      wasRerolled: true,
      wasFallback: true,
    });
    expect(a.total).toBeLessThanOrEqual(XP_PER_QUEST_CAP);
    expect(a.breakdown.afterReroll).toBe(true);
    expect(a.breakdown.fallbackPenalty).toBeGreaterThan(0);
    expect(a.breakdown.outdoorBonus).toBeGreaterThan(0);
  });

  it('sous-total non négatif si pénalités élevées', () => {
    const a = computeCompletionXp({
      phaseAtAssignment: 'calibration',
      streakCount: 0,
      isOutdoor: false,
      explorerAxis: 'homebody',
      riskAxis: 'cautious',
      wasRerolled: false,
      wasFallback: true,
    });
    expect(a.total).toBeGreaterThanOrEqual(0);
  });
});

describe('levelFromTotalXp', () => {
  it('niveau 1 à 0 XP', () => {
    const l = levelFromTotalXp(0);
    expect(l.level).toBe(1);
    expect(l.xpIntoLevel).toBe(0);
    expect(l.xpPerLevel).toBe(XP_PER_LEVEL);
  });
  it('xp négatif traité comme 0', () => {
    expect(levelFromTotalXp(-10).level).toBe(1);
  });
  it('plafonne le niveau interne', () => {
    const l = levelFromTotalXp(999999);
    expect(l.level).toBeLessThanOrEqual(99);
  });
});
