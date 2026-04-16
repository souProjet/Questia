import { describe, expect, it } from 'vitest';
import {
  PHASE_BOUNDARIES,
  getPhaseForDay,
  shouldDowngrade,
  getEffectivePhase,
  shouldUpscale,
  DAILY_FREE_REROLLS,
  MAX_REROLLS_PER_DAY,
} from './escalation';
import type { QuestLog } from '../types';

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
  it("retourne la phase naturelle en l'absence de downgrade", () => {
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

describe('shouldUpscale', () => {
  it('false si déjà en rupture', () => {
    const logs: QuestLog[] = [
      { ...minimalLog(), status: 'completed' },
      { ...minimalLog(), status: 'completed' },
      { ...minimalLog(), status: 'completed' },
    ];
    expect(shouldUpscale('rupture', logs)).toBe(false);
  });
  it('true en calibration avec 3+ complétions consécutives', () => {
    const logs: QuestLog[] = [
      { ...minimalLog(), status: 'completed' },
      { ...minimalLog(), status: 'completed' },
      { ...minimalLog(), status: 'completed' },
    ];
    expect(shouldUpscale('calibration', logs)).toBe(true);
  });
  it('false si série de complétions cassée par un rejet', () => {
    const logs: QuestLog[] = [
      { ...minimalLog(), status: 'completed' },
      { ...minimalLog(), status: 'rejected' },
      { ...minimalLog(), status: 'completed' },
      { ...minimalLog(), status: 'completed' },
    ];
    expect(shouldUpscale('calibration', logs)).toBe(false);
  });
});
