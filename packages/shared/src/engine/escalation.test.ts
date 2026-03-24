import { describe, expect, it } from 'vitest';
import {
  PHASE_BOUNDARIES,
  getPhaseForDay,
  shouldDowngrade,
  getEffectivePhase,
  computeProfileUpdate,
  DAILY_FREE_REROLLS,
  MAX_REROLLS_PER_DAY,
} from './escalation';
import type { QuestLog, UserProfile } from '../types';

const baseProfile: UserProfile = {
  id: 'p1',
  quadrant: { explorerAxis: 'explorer', riskAxis: 'cautious' },
  declaredPersonality: {
    openness: 0.5,
    conscientiousness: 0.5,
    extraversion: 0.5,
    agreeableness: 0.5,
    emotionalStability: 0.5,
    thrillSeeking: 0.5,
    boredomSusceptibility: 0.5,
  },
  exhibitedPersonality: {
    openness: 0.5,
    conscientiousness: 0.5,
    extraversion: 0.5,
    agreeableness: 0.5,
    emotionalStability: 0.5,
    thrillSeeking: 0.5,
    boredomSusceptibility: 0.5,
  },
  currentDay: 1,
  currentPhase: 'calibration',
  congruenceDelta: 0,
  streakCount: 0,
  rerollsRemaining: 1,
  createdAt: '',
  updatedAt: '',
};

describe('PHASE_BOUNDARIES', () => {
  it('expose des bornes cohérentes', () => {
    expect(PHASE_BOUNDARIES.calibration.end).toBeLessThan(PHASE_BOUNDARIES.expansion.start);
    expect(DAILY_FREE_REROLLS).toBe(1);
    expect(MAX_REROLLS_PER_DAY).toBe(3);
  });
});

describe('getPhaseForDay', () => {
  it('calibration jours 1–3', () => {
    expect(getPhaseForDay(1)).toBe('calibration');
    expect(getPhaseForDay(3)).toBe('calibration');
  });
  it('expansion jours 4–10', () => {
    expect(getPhaseForDay(4)).toBe('expansion');
    expect(getPhaseForDay(10)).toBe('expansion');
  });
  it('rupture jour 11+', () => {
    expect(getPhaseForDay(11)).toBe('rupture');
    expect(getPhaseForDay(99)).toBe('rupture');
  });
});

describe('shouldDowngrade', () => {
  it('false hors rupture', () => {
    expect(shouldDowngrade('calibration', [])).toBe(false);
  });
  it('false en rupture sans assez de rejets', () => {
    const logs: QuestLog[] = [{ ...minimalLog(), status: 'rejected' }];
    expect(shouldDowngrade('rupture', logs)).toBe(false);
  });
  it('true en rupture avec 2+ rejets récents', () => {
    const logs: QuestLog[] = [
      { ...minimalLog(), status: 'rejected' },
      { ...minimalLog(), status: 'rejected' },
    ];
    expect(shouldDowngrade('rupture', logs)).toBe(true);
  });
});

function minimalLog(): QuestLog {
  return {
    id: '',
    userId: '',
    questId: 1,
    assignedAt: '',
    status: 'completed',
    congruenceDeltaAtAssignment: 0,
    phaseAtAssignment: 'calibration',
    wasRerolled: false,
    wasFallback: false,
    safetyConsentGiven: false,
  };
}

describe('getEffectivePhase', () => {
  it('retourne la phase naturelle en l’absence de downgrade', () => {
    expect(getEffectivePhase(5, [])).toBe('expansion');
  });
  it('passe en expansion si downgrade en rupture', () => {
    const logs: QuestLog[] = [
      { ...minimalLog(), status: 'rejected' },
      { ...minimalLog(), status: 'rejected' },
    ];
    expect(getEffectivePhase(12, logs)).toBe('expansion');
  });
});

describe('computeProfileUpdate', () => {
  it('incrémente le jour et la série si complété', () => {
    const u = computeProfileUpdate(baseProfile, true);
    expect(u.currentDay).toBe(2);
    expect(u.streakCount).toBe(1);
    expect(u.currentPhase).toBe('calibration');
    expect(u.updatedAt).toBeDefined();
  });
  it('remet la série à 0 si non complété', () => {
    const u = computeProfileUpdate({ ...baseProfile, streakCount: 5 }, false);
    expect(u.streakCount).toBe(0);
  });
});
